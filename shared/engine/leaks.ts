// Caçador de vazamentos: assinaturas, tarifas, seguros embutidos e cobranças duplicadas.
import type { Leak, LeakKind, Subscription, Transaction } from "../schema";
import { brl, monthLong, pct } from "../format";
import { normalize } from "./categorize";
import { sum } from "./finance";

export interface LeakCandidate {
  key: string;
  kind: LeakKind;
  name: string;
  monogram: string;
  sourceLabel: string;
  amount: number;
  reason: string;
  cancelWhere: string;
}

export interface RecurringCharge {
  key: string;
  name: string;
  amount: number;
  accountId: string | null;
  months: string[];
  /** Último aumento de preço acima de 10%: valor antes, depois e a data da cobrança nova. */
  increase: { from: number; to: number; date: string } | null;
  lastDate: string;
}

const FAMILIES: Record<string, { label: string; members: RegExp }> = {
  musica: { label: "Serviço de música", members: /spotify|deezer|apple music|youtube music|tidal|amazon music/ },
  nuvem: { label: "Armazenamento na nuvem", members: /icloud|google one|dropbox|onedrive/ },
};

export function monogram(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase());
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Nome limpo do estabelecimento: tira códigos, asteriscos e parcelas. */
export function merchantName(description: string): string {
  return description
    .replace(/\*.*$/, "")
    .replace(/\b\d{2}\/\d{2}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Cobranças recorrentes: mesmo estabelecimento em ≥ 2 meses, valor dentro de ±15%. */
export function recurringCharges(transactions: Transaction[]): RecurringCharge[] {
  const byKey = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.kind !== "gasto" || t.amount <= 0) continue;
    const key = normalize(merchantName(t.description));
    if (!key) continue;
    const list = byKey.get(key) || [];
    list.push(t);
    byKey.set(key, list);
  }
  const out: RecurringCharge[] = [];
  for (const [key, list] of byKey) {
    const sorted = list.sort((a, b) => a.date.localeCompare(b.date));
    const months = [...new Set(sorted.map((t) => t.date.slice(0, 7)))];
    const isSub = sorted.some((t) => t.categoryId === "assinaturas");
    if (months.length < 2 && !isSub) continue;
    const last = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const similar = !prev || Math.abs(last.amount - prev.amount) / prev.amount <= 0.15 || isSub;
    if (!similar && !isSub) continue;
    if (!isSub && sorted.some((t) => t.categoryId !== sorted[0].categoryId)) continue;
    if (!isSub && !["assinaturas", "juros"].includes(last.categoryId)) continue;
    let increase: RecurringCharge["increase"] = null;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].amount > sorted[i - 1].amount * 1.1) increase = { from: sorted[i - 1].amount, to: sorted[i].amount, date: sorted[i].date };
    }
    out.push({ key, name: merchantName(last.description), amount: last.amount, accountId: last.accountId, months, increase, lastDate: last.date });
  }
  return out;
}

export type AccountLabeler = (accountId: string | null) => string;

/** Detecta vazamentos a partir das transações dos últimos 90 dias e do check-in de assinaturas. */
export function detectLeaks(transactions: Transaction[], subscriptions: Subscription[], label: AccountLabeler, today: Date): LeakCandidate[] {
  const since = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90).toISOString().slice(0, 10);
  const recent = transactions.filter((t) => t.date >= since);
  const out: LeakCandidate[] = [];
  const seen = new Set<string>();
  const push = (c: LeakCandidate) => {
    if (seen.has(c.key)) return;
    seen.add(c.key);
    out.push(c);
  };

  const subs = recurringCharges(recent).filter((r) => {
    const t = recent.find((x) => normalize(merchantName(x.description)) === r.key);
    return t?.categoryId === "assinaturas";
  });

  // Serviços repetidos da mesma família em contas diferentes: o mais caro vira vazamento.
  for (const fam of Object.values(FAMILIES)) {
    const members = subs.filter((s) => fam.members.test(s.key));
    const accounts = new Set(members.map((m) => m.accountId));
    if (members.length >= 2 && accounts.size >= 2) {
      const sorted = [...members].sort((a, b) => b.amount - a.amount);
      const [extra, keep] = sorted;
      push({
        key: `sub:${extra.key}`,
        kind: "sub",
        name: extra.name,
        monogram: monogram(extra.name),
        sourceLabel: label(extra.accountId),
        amount: extra.amount,
        reason: `${fam.label} repetido — você também paga ${keep.name} no ${label(keep.accountId)}`,
        cancelWhere: `o app ou site do ${extra.name}`,
      });
    }
  }

  // Aumento de preço acima de 10% em alguma cobrança do período.
  for (const s of subs) {
    if (!s.increase) continue;
    const up = ((s.increase.to - s.increase.from) / s.increase.from) * 100;
    push({ key: `sub:${s.key}`, kind: "sub", name: s.name, monogram: monogram(s.name), sourceLabel: label(s.accountId), amount: s.amount, reason: `O preço subiu ${pct(Math.round(up), 0)} em ${monthLong(Number(s.increase.date.slice(5, 7)) - 1)}`, cancelWhere: `o site do ${s.name}` });
  }

  // Assinaturas marcadas "Não usei" no check-in.
  for (const s of subscriptions) {
    if (s.checkin !== "nao_usei") continue;
    push({ key: `sub:${normalize(s.name)}`, kind: "sub", name: s.name, monogram: s.monogram, sourceLabel: s.accountLabel, amount: s.amount, reason: "Você marcou que não usou no último mês", cancelWhere: `o app ou site do ${s.name}` });
  }

  // Tarifas, anuidades e seguros embutidos (último valor de cada um).
  const lastBy = new Map<string, Transaction>();
  for (const t of recent) {
    if (t.kind !== "gasto") continue;
    const d = normalize(t.description);
    if (/tarifa|cesta de servi|pacote de servi|anuidade|seguro/.test(d)) {
      const k = normalize(merchantName(t.description));
      const cur = lastBy.get(k);
      if (!cur || cur.date < t.date) lastBy.set(k, t);
    }
  }
  for (const [k, t] of lastBy) {
    const d = normalize(t.description);
    const isIns = /seguro/.test(d);
    const name = merchantName(t.description);
    push({
      key: `${isIns ? "seg" : "tar"}:${k}`,
      kind: isIns ? "seg" : "tar",
      name,
      monogram: monogram(label(t.accountId)),
      sourceLabel: label(t.accountId),
      amount: t.amount,
      reason: isIns ? "Seguro embutido e opcional; dá para cancelar" : /anuidade/.test(d) ? "Dá para pedir isenção da anuidade" : "Tarifa que pode ser trocada pelos serviços essenciais gratuitos",
      cancelWhere: `o app ${label(t.accountId).replace(/^(Conta|Cartão) /, "")}`,
    });
  }

  // Cobrança duplicada: mesma conta, descrição, valor e dia.
  const dupKey = new Map<string, Transaction[]>();
  for (const t of recent) {
    if (t.kind !== "gasto") continue;
    const k = `${t.accountId}|${normalize(t.description)}|${t.amount}|${t.date}`;
    dupKey.set(k, [...(dupKey.get(k) || []), t]);
  }
  for (const list of dupKey.values()) {
    if (list.length < 2) continue;
    const t = list[0];
    const name = `${merchantName(t.description)} · ${Number(t.date.slice(8, 10))} ${monthLong(Number(t.date.slice(5, 7)) - 1).slice(0, 3)}`;
    push({ key: `dup:${t.id}`, kind: "dup", name, monogram: monogram(merchantName(t.description)), sourceLabel: label(t.accountId), amount: t.amount, reason: "Mesmo valor, mesmo dia, cobrado 2 vezes", cancelWhere: `o app ${label(t.accountId).replace(/^(Conta|Cartão) /, "")}` });
  }
  return out;
}

export interface LeakTotals {
  monthly: number;
  yearly: number;
  duplicates: number;
  saved: number;
  counts: Record<LeakKind, number>;
}

export function leakTotals(leaks: Leak[]): LeakTotals {
  const open = leaks.filter((l) => l.status === "aberto");
  const monthly = sum(open.filter((l) => l.kind !== "dup").map((l) => l.amount));
  return {
    monthly,
    yearly: monthly * 12,
    duplicates: sum(open.filter((l) => l.kind === "dup").map((l) => l.amount)),
    saved: sum(leaks.filter((l) => l.status === "cancelado" && l.kind !== "dup").map((l) => l.amount)),
    counts: { sub: open.filter((l) => l.kind === "sub").length, tar: open.filter((l) => l.kind === "tar").length, seg: open.filter((l) => l.kind === "seg").length, dup: open.filter((l) => l.kind === "dup").length },
  };
}

/** Passo a passo de cancelamento por tipo de vazamento. */
export function cancelSteps(l: Pick<Leak, "kind" | "name" | "cancelWhere" | "sourceLabel" | "amount" | "key">): string[] {
  const where = l.cancelWhere;
  if (l.kind === "dup") {
    const app = l.sourceLabel.replace(/^(Conta|Cartão) /, "");
    return [`Abra o app ${app} e vá em Cartões › Fatura atual`, `Toque na segunda cobrança de ${brl(l.amount, true)} e escolha “Contestar compra”`, "Guarde o protocolo; o estorno costuma sair em até 2 faturas"];
  }
  if (l.kind === "tar") {
    const anuid = /anuidade/i.test(l.name);
    return [`Abra ${where} e procure “Pacote de serviços” ou “Anuidade”`, anuid ? "Peça a isenção da anuidade pelo seu volume de gastos" : "Peça a troca para os serviços essenciais gratuitos", "Confirme e anote o número de protocolo"];
  }
  if (l.kind === "seg") return [`Fale com ${where} pelo app ou telefone`, `Peça o cancelamento do ${l.name.toLowerCase()}`, "Confira na próxima parcela se o valor foi retirado"];
  return [`Abra ${where} e entre em Conta ou Perfil`, "Procure “Assinatura” ou “Plano” e toque em Cancelar", "Confirme e anote o número de protocolo"];
}

/** Assinaturas que estão em uso (não aparecem como vazamento). */
export function subscriptionsInUse(subscriptions: Subscription[], leaks: Leak[]): Subscription[] {
  const leakNames = new Set(leaks.filter((l) => l.kind === "sub" && l.status !== "uso").map((l) => normalize(l.name)));
  return subscriptions.filter((s) => !leakNames.has(normalize(s.name)));
}
