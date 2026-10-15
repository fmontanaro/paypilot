// Pipeline de importação: lê o arquivo, acha ou cria a conta, categoriza, evita duplicar,
// e depois atualiza vazamentos, assinaturas, rendas e compromissos derivados.
import crypto from "crypto";
import { and, eq, gte } from "drizzle-orm";
import * as S from "@shared/schema";
import { categorize, detectLeaks, makeAccountLabel, merchantName, monogram, normalize, recurringCharges } from "@shared/engine";
import { isoDate } from "@shared/format";
import { db } from "../db";
import { todayBR } from "../storage";
import { ai } from "../assistant/llm";
import { detectFormat, parseCSV, parseOFX, type ParsedFile, type ParsedTx } from "./parsers";

export interface UploadFile {
  name: string;
  /** Texto (OFX/CSV) ou base64 (PDF/imagem). */
  content: string;
  encoding?: "text" | "base64";
  mime?: string;
  /** Conta de destino escolhida (ex.: foto da fatura do cartão manual). */
  accountId?: string;
}

export interface ImportResult {
  importId: string;
  fileName: string;
  format: string;
  status: "lido" | "pendente" | "erro";
  txCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  accountKind: "conta" | "cartao" | null;
  institution: string | null;
  message: string | null;
}

export const fp = (...parts: (string | number | undefined)[]) => crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 24);

async function findOrCreateAccount(userId: string, parsed: ParsedFile, forced?: string): Promise<S.Account> {
  const d = db();
  if (forced) {
    const [a] = await d.select().from(S.accounts).where(and(eq(S.accounts.id, forced), eq(S.accounts.userId, userId)));
    if (a) return a;
  }
  const institution = parsed.institution || "Outro banco";
  const kind: S.AccountKind = parsed.kind === "cartao" ? "cartao" : "conta";
  const existing = await d
    .select()
    .from(S.accounts)
    .where(and(eq(S.accounts.userId, userId), eq(S.accounts.institution, institution), eq(S.accounts.kind, kind)));
  if (existing[0]) return existing[0];
  const [a] = await d
    .insert(S.accounts)
    .values({ userId, institution, name: kind === "cartao" ? `Cartão ${institution}` : `Conta ${institution}`, kind, source: "arquivo", label: kind === "cartao" ? institution : null })
    .returning();
  return a;
}

async function parseFile(f: UploadFile): Promise<{ format: string; parsed: ParsedFile | null; message: string | null }> {
  const text = f.encoding === "base64" ? "" : f.content;
  const format = detectFormat(f.name, text);
  if (!format) return { format: "desconhecido", parsed: null, message: "Formato não suportado. Envie OFX, CSV, PDF ou foto." };
  if (format === "ofx") return { format, parsed: parseOFX(text, f.name), message: null };
  if (format === "csv") return { format, parsed: parseCSV(text, f.name), message: null };
  // PDF e foto: leitura pelo provedor de IA (só extrai as linhas; nenhum cálculo).
  if (!ai.available) return { format, parsed: null, message: "Leitura de PDF e foto precisa do leitor com IA, que ainda não está ligado. Envie OFX ou CSV, ou tente mais tarde." };
  try {
    const rows: ParsedTx[] = await ai.readStatement(f.content, f.mime || (format === "pdf" ? "application/pdf" : "image/jpeg"));
    return { format, parsed: { institution: null, kind: /fatura|cart/i.test(f.name) ? "cartao" : "conta", transactions: rows }, message: null };
  } catch (e) {
    return { format, parsed: null, message: "Não conseguimos ler este arquivo. Tente uma foto mais nítida ou o OFX do banco." };
  }
}

export async function importFile(userId: string, f: UploadFile): Promise<ImportResult> {
  const d = db();
  const { format, parsed, message } = await parseFile(f);
  if (!parsed) {
    const [row] = await d.insert(S.imports).values({ userId, fileName: f.name, format, status: format === "desconhecido" ? "erro" : "pendente", message }).returning();
    return { importId: row.id, fileName: f.name, format, status: row.status as ImportResult["status"], txCount: 0, periodStart: null, periodEnd: null, accountKind: null, institution: null, message };
  }
  const account = await findOrCreateAccount(userId, parsed, f.accountId);
  const rules = await d.select().from(S.categoryRules).where(eq(S.categoryRules.userId, userId));
  const dates = parsed.transactions.map((t) => t.date).sort();
  const [imp] = await d
    .insert(S.imports)
    .values({ userId, fileName: f.name, format, status: "lido", txCount: 0, periodStart: dates[0] ?? null, periodEnd: dates[dates.length - 1] ?? null })
    .returning();
  // Ocorrências iguais no mesmo dia viram impressões digitais diferentes (cobrança duplicada é real).
  const seen = new Map<string, number>();
  const rows: (typeof S.transactions.$inferInsert)[] = parsed.transactions.map((t) => {
    // Pelo conteúdo (e não pelo FITID), para o mesmo lançamento vindo por arquivo e por Open Finance não duplicar.
    const base = fp(account.id, t.date, t.amount.toFixed(2), normalize(t.description));
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const desc = normalize(t.description);
    const isIncome = t.amount < 0;
    const kind: S.TxKind = isIncome ? (/pagamento (recebido|de fatura)|pgto fatura/.test(desc) ? "pagamento_fatura" : "entrada") : /pix (para|enviado)|ted |transferencia/.test(desc) ? "transferencia" : "gasto";
    const cat = categorize(t.description, rules);
    const flag = /tarifa|cesta de servi|anuidade/.test(desc) ? "fee" : null;
    return { userId, accountId: account.id, importId: imp.id, date: t.date, description: t.description, amount: t.amount, kind, categoryId: kind === "gasto" ? cat.categoryId : "transferencia", groupId: cat.groupId, flag, fingerprint: n > 1 ? `${base}#${n}` : base };
  });
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const res = await d.insert(S.transactions).values(rows.slice(i, i + 200)).onConflictDoNothing().returning({ id: S.transactions.id });
    inserted += res.length;
  }
  await d.update(S.imports).set({ txCount: inserted, message: inserted < rows.length ? `${rows.length - inserted} já estavam no PayPilot` : null }).where(eq(S.imports.id, imp.id));
  await afterImport(userId);
  return { importId: imp.id, fileName: f.name, format, status: "lido", txCount: inserted, periodStart: dates[0] ?? null, periodEnd: dates[dates.length - 1] ?? null, accountKind: parsed.kind, institution: account.institution, message: null };
}

/** Atualiza marcações, vazamentos, assinaturas, rendas e compromissos depois de novos dados. */
export async function afterImport(userId: string) {
  const d = db();
  const today = todayBR();
  const since = isoDate(new Date(today.getFullYear(), today.getMonth() - 6, 1));
  const [txs, accounts, subs, incomes, commitments] = await Promise.all([
    d.select().from(S.transactions).where(and(eq(S.transactions.userId, userId), gte(S.transactions.date, since))),
    d.select().from(S.accounts).where(eq(S.accounts.userId, userId)),
    d.select().from(S.subscriptions).where(eq(S.subscriptions.userId, userId)),
    d.select().from(S.incomes).where(eq(S.incomes.userId, userId)),
    d.select().from(S.commitments).where(eq(S.commitments.userId, userId)),
  ]);
  const { label } = makeAccountLabel(accounts);

  // Assinaturas recorrentes novas.
  const known = new Set(subs.map((s) => normalize(s.name)));
  const newSubs = recurringCharges(txs)
    .filter((r) => txs.some((t) => normalize(merchantName(t.description)) === r.key && t.categoryId === "assinaturas"))
    .filter((r) => !known.has(r.key));
  if (newSubs.length) await d.insert(S.subscriptions).values(newSubs.map((r) => ({ userId, name: r.name, monogram: monogram(r.name), amount: r.amount, accountLabel: label(r.accountId) })));
  const allSubs = newSubs.length ? await d.select().from(S.subscriptions).where(eq(S.subscriptions.userId, userId)) : subs;

  // Vazamentos: insere só os novos; decisões do usuário nunca são sobrescritas.
  const leaks = detectLeaks(txs, allSubs, label, today);
  if (leaks.length) await d.insert(S.leaks).values(leaks.map((l) => ({ userId, ...l }))).onConflictDoNothing();

  // Marca cobranças duplicadas e serviços repetidos nas transações.
  for (const l of leaks) {
    if (l.kind === "dup") {
      const id = l.key.slice(4);
      const t = txs.find((x) => x.id === id);
      if (t) await d.update(S.transactions).set({ flag: "dup" }).where(and(eq(S.transactions.userId, userId), eq(S.transactions.accountId, t.accountId!), eq(S.transactions.date, t.date), eq(S.transactions.amount, t.amount), eq(S.transactions.description, t.description)));
    }
  }

  // Rendas recorrentes (entradas com a mesma descrição em 2 meses ou mais), se o usuário ainda não tem.
  if (!incomes.length) {
    const byDesc = new Map<string, S.Transaction[]>();
    for (const t of txs.filter((x) => x.kind === "entrada")) byDesc.set(normalize(merchantName(t.description)), [...(byDesc.get(normalize(merchantName(t.description))) || []), t]);
    const found = [...byDesc.values()].filter((l) => new Set(l.map((t) => t.date.slice(0, 7))).size >= 2);
    if (found.length) await d.insert(S.incomes).values(found.map((l) => ({ userId, name: merchantName(l[0].description), amount: Math.abs(l[l.length - 1].amount), payDay: Number(l[l.length - 1].date.slice(8, 10)), recurring: true })));
  }

  // Faturas de cartões com datas conhecidas (Open Finance) que ainda não viraram compromisso.
  let sortN = commitments.length;
  const since30 = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));
  for (const a of accounts.filter((x) => x.kind === "cartao" && x.dueDay && !commitments.some((c) => c.accountId === x.id))) {
    const amount = txs.filter((t) => t.accountId === a.id && t.kind === "gasto" && t.date >= since30).reduce((s, t) => s + t.amount, 0);
    if (amount <= 0) continue;
    await d.insert(S.commitments).values({ userId, name: `Fatura ${a.institution}`, kind: "fatura", amount: Math.round(amount * 100) / 100, dueDay: a.dueDay, dueNextMonth: (a.dueDay ?? 0) < today.getDate(), accountId: a.id, parcelMonths: a.installmentRate != null ? 6 : null, delayable: true, delayRisk: "rotativo", sort: sortN++ });
  }

  // Compromissos fixos recorrentes (moradia, educação, saúde, empresa) que ainda não existem.
  const names = new Set(commitments.map((c) => normalize(c.name)));
  const fixed = recurringChargesAll(txs).filter((r) => ["moradia", "educacao", "saude", "empresa"].includes(r.categoryId) && !names.has(normalize(r.name)));
  if (fixed.length) {
    await d.insert(S.commitments).values(fixed.map((r) => ({ userId, name: r.name, kind: "conta" as const, amount: r.amount, dueDay: r.day, delayable: true, delayRisk: "multa" as const, sort: sortN++ })));
  }
}

/** Cobranças mensais em qualquer categoria (para derivar contas fixas). */
function recurringChargesAll(txs: S.Transaction[]) {
  const map = new Map<string, S.Transaction[]>();
  for (const t of txs) {
    if (t.kind !== "gasto" || t.amount <= 0) continue;
    const k = normalize(merchantName(t.description)).replace(/\d+\/\d+/g, "").trim();
    map.set(k, [...(map.get(k) || []), t]);
  }
  const out: { name: string; amount: number; day: number; categoryId: string }[] = [];
  for (const list of map.values()) {
    const months = new Set(list.map((t) => t.date.slice(0, 7)));
    if (months.size < 2) continue;
    // Conta fixa: valores parecidos (±10%) todo mês.
    const amounts = list.map((t) => t.amount);
    if (Math.max(...amounts) > Math.min(...amounts) * 1.1) continue;
    const last = list.sort((a, b) => a.date.localeCompare(b.date))[list.length - 1];
    out.push({ name: merchantName(last.description).replace(/\s*\d+\/\d+\s*$/, ""), amount: last.amount, day: Number(last.date.slice(8, 10)), categoryId: last.categoryId });
  }
  return out;
}
