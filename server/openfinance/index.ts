// Open Finance. O PayPilot não é instituição regulada: os dados chegam por um agregador autorizado
// (Pluggy, Belvo ou similar). Hoje só existe o provedor "sandbox", que simula a conexão com dados
// de exemplo para validar o fluxo. O agregador real entra na etapa 2 (docs/roadmap.md).
import { and, eq } from "drizzle-orm";
import * as S from "@shared/schema";
import { buildPersona } from "@shared/demo/persona";
import { db } from "../db";
import { todayBR } from "../storage";
import { afterImport, fp } from "../ingestion";
import { normalize } from "@shared/engine";

export interface Provider {
  id: string;
  /** Cria o consentimento e devolve os itens encontrados. */
  connect(userId: string, institution: string): Promise<{ connection: S.Connection; found: { n: string; v: string }[] }>;
  sync(userId: string, connectionId: string): Promise<S.Connection>;
}

export { BANKS } from "@shared/banks";

const TEMPLATE: Record<string, { accounts: string[]; items: string }> = {
  Nubank: { accounts: ["nubank"], items: "Conta + cartão" },
  Itaú: { accounts: ["itau", "conta_itau", "cheque_itau"], items: "2 contas + 2 cartões" },
  Santander: { accounts: ["santander", "emprestimo_santander", "conta_santander"], items: "Cartão + empréstimo" },
  XP: { accounts: ["xp"], items: "Cartão Visa Infinite" },
};

const fmt = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

export const sandbox: Provider = {
  id: "sandbox",
  async connect(userId, institution) {
    const d = db();
    const today = todayBR();
    const tpl = TEMPLATE[institution] || TEMPLATE["Itaú"];
    const r = buildPersona(today, `${userId}_${institution.replace(/\W/g, "").toLowerCase()}`);
    const prefix = `${userId}_${institution.replace(/\W/g, "").toLowerCase()}_`;
    const [connection] = await d
      .insert(S.connections)
      .values({ userId, provider: "sandbox", institution, itemsLabel: tpl.items, status: "ok", consentExpiresAt: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()) })
      .returning();
    const accs = r.accounts.filter((a) => tpl.accounts.some((k) => a.id === prefix + k));
    const existing = await d.select().from(S.accounts).where(eq(S.accounts.userId, userId));
    const named = (a: S.Account) => ({ institution: TEMPLATE[institution] ? a.institution : institution, name: TEMPLATE[institution] ? a.name : a.name.replace(/Itaú( Personnalité)?/, institution), label: TEMPLATE[institution] ? a.label : a.label ? institution : null });
    // Conta que já veio por arquivo vira a mesma conta conectada (e as transações não duplicam).
    const idMap = new Map<string, string>();
    const toInsert: S.Account[] = [];
    for (const a of accs) {
      const n = named(a);
      const match = existing.find((x) => x.institution === n.institution && x.kind === a.kind && x.source === "arquivo");
      if (match) {
        idMap.set(a.id, match.id);
        await d.update(S.accounts).set({ ...n, connectionId: connection.id, source: "open_finance", creditLimit: a.creditLimit, used: a.used, debtBalance: a.debtBalance, closingDay: a.closingDay, dueDay: a.dueDay, monthlyRate: a.monthlyRate, installmentRate: a.installmentRate, installmentAmount: a.installmentAmount, installmentsLeft: a.installmentsLeft }).where(eq(S.accounts.id, match.id));
      } else {
        idMap.set(a.id, a.id);
        toInsert.push({ ...a, ...n, userId, connectionId: connection.id, source: "open_finance" });
      }
    }
    if (toInsert.length) await d.insert(S.accounts).values(toInsert).onConflictDoNothing();
    const since = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().slice(0, 10);
    const txs = r.transactions
      .filter((t) => t.accountId && idMap.has(t.accountId) && t.date >= since)
      .map((t) => {
        const accountId = idMap.get(t.accountId!)!;
        return { ...t, userId, accountId, groupId: null, fingerprint: fp(accountId, t.date, t.amount.toFixed(2), normalize(t.description)) };
      });
    for (let i = 0; i < txs.length; i += 200) await d.insert(S.transactions).values(txs.slice(i, i + 200)).onConflictDoNothing();
    const renamed = accs.map((a) => ({ ...a, ...named(a) }));
    await afterImport(userId);
    const found = renamed.map((a) => ({
      n: a.kind === "conta" ? "Conta corrente" : a.kind === "cheque_especial" ? "Cheque especial" : a.kind === "emprestimo" ? "Empréstimo pessoal" : `Cartão ${a.name.replace(/^Cartão /, "")}`,
      v: a.kind === "cheque_especial" ? `${fmt(a.used ?? 0)} usados` : a.kind === "emprestimo" ? `Saldo ${fmt(a.debtBalance ?? 0)}` : a.kind === "cartao" ? `Fatura ${fmt(a.used ?? 0)}` : "Atualiza todo dia",
    }));
    return { connection, found };
  },
  async sync(userId, connectionId) {
    const [c] = await db()
      .update(S.connections)
      .set({ status: "ok", lastSyncAt: new Date(), lastError: null })
      .where(and(eq(S.connections.id, connectionId), eq(S.connections.userId, userId)))
      .returning();
    return c;
  },
};

export const provider: Provider = sandbox;
