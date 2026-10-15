// Gastos por categoria (com variação contra o mesmo período do mês anterior) e grupos de despesa.
import type { ExpenseGroup, GroupObligation, Transaction } from "../schema";
import { CATEGORIES, category } from "../categories";
import { monthKey } from "../format";
import { sum } from "./finance";

export type TypeFilter = "todos" | "fixo" | "variavel" | "essencial" | "superfluo";

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  hue: number;
  value: number;
  previous: number;
  incomePct: number;
  variation: number;
  fixed: boolean;
  essential: boolean;
}

export interface SpendingFilter {
  type: TypeFilter;
  accountId: string | "todas";
  groupId: string | "todos" | "pessoal";
}

function inPeriod(t: Transaction, key: string, untilDay: number | null) {
  if (!t.date.startsWith(key)) return false;
  return untilDay == null || Number(t.date.slice(8, 10)) <= untilDay;
}

export function categoryRows(transactions: Transaction[], today: Date, income: number, f: SpendingFilter): CategoryRow[] {
  const cur = monthKey(today);
  const prev = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const day = today.getDate();
  const pass = (t: Transaction) =>
    t.kind === "gasto" &&
    t.amount > 0 &&
    (f.accountId === "todas" || t.accountId === f.accountId) &&
    (f.groupId === "todos" || (f.groupId === "pessoal" ? !t.groupId : t.groupId === f.groupId));
  const rows: CategoryRow[] = [];
  for (const c of CATEGORIES) {
    if (c.id === "transferencia") continue;
    if (f.type === "fixo" && !c.fixed) continue;
    if (f.type === "variavel" && c.fixed) continue;
    if (f.type === "essencial" && !c.essential) continue;
    if (f.type === "superfluo" && c.essential) continue;
    const value = sum(transactions.filter((t) => t.categoryId === c.id && pass(t) && inPeriod(t, cur, day)).map((t) => t.amount));
    if (value <= 0) continue;
    const previous = sum(transactions.filter((t) => t.categoryId === c.id && pass(t) && inPeriod(t, prev, day)).map((t) => t.amount));
    rows.push({ id: c.id, name: c.name, icon: c.icon, hue: c.hue, value, previous, incomePct: income ? (value / income) * 100 : 0, variation: previous ? (value - previous) / previous : 0, fixed: c.fixed, essential: c.essential });
  }
  return rows.sort((a, b) => b.value - a.value);
}

/** Segmentos do gráfico de rosca (graus). */
export function donutSegments(rows: CategoryRow[]): { id: string; hue: number; from: number; to: number }[] {
  const total = sum(rows.map((r) => r.value));
  let acc = 0;
  return rows.map((r) => {
    const from = (acc / total) * 360;
    acc += r.value;
    return { id: r.id, hue: r.hue, from, to: (acc / total) * 360 };
  });
}

export interface DayGroup {
  key: string;
  date: string;
  total: number;
  items: Transaction[];
}

/** Transações agrupadas por dia, mais recentes primeiro. */
export function byDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) map.set(t.date, [...(map.get(t.date) || []), t]);
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ key: date, date, total: sum(items.filter((t) => t.amount > 0).map((t) => t.amount)), items: items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) }));
}

export interface GroupView {
  group: ExpenseGroup;
  monthTotal: number;
  yearly: number;
  obligations: GroupObligation[];
}

/** Total do mês do grupo: obrigações fixas + transações classificadas no grupo que não são obrigação. */
export function groupView(g: ExpenseGroup, obligations: GroupObligation[], transactions: Transaction[], today: Date): GroupView {
  const obs = obligations.filter((o) => o.groupId === g.id);
  const fixed = sum(obs.map((o) => o.amount));
  const key = monthKey(today);
  const extra = sum(transactions.filter((t) => t.groupId === g.id && t.kind === "gasto" && t.date.startsWith(key) && !obs.some((o) => t.amount === o.amount)).map((t) => t.amount));
  const monthTotal = fixed + extra;
  return { group: g, monthTotal, yearly: monthTotal * 12, obligations: obs };
}

export const categoryOf = category;

export interface ManualStatement {
  used: number;
  entries: Transaction[];
  periodStart: string;
  periodEnd: string;
  dueDate: Date;
}

/**
 * Fatura do cartão manual que vence a seguir: compras entre o fechamento anterior (exclusive) e o
 * último fechamento (inclusive). Depois do fechamento, compras novas vão para a próxima fatura.
 */
export function manualStatement(closingDay: number, dueDay: number, accountId: string, transactions: Transaction[], today: Date): ManualStatement {
  const y = today.getFullYear();
  const m = today.getMonth();
  const closedThisMonth = today.getDate() > closingDay;
  const end = new Date(y, m - (closedThisMonth ? 0 : 1), closingDay);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, closingDay + 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const ps = iso(start);
  const pe = iso(end);
  const entries = transactions.filter((t) => t.accountId === accountId && t.kind === "gasto" && t.date >= ps && t.date <= pe).sort((a, b) => b.date.localeCompare(a.date));
  const due = new Date(end.getFullYear(), end.getMonth() + (dueDay <= closingDay ? 1 : 0), dueDay);
  return { used: sum(entries.map((t) => t.amount)), entries, periodStart: ps, periodEnd: pe, dueDate: due };
}

export interface RaioX {
  months: string[];
  /** Positivo = buraco (compromissos acima da renda); negativo = sobra. */
  avgHole: number;
  interestMonthly: number;
  interestPct: number;
  subsCount: number;
  subsTotal: number;
}

/** Raio-X do onboarding: média dos últimos meses fechados com dados (até 3). */
export function raioX(transactions: Transaction[], incomeMonthly: number, subscriptions: { amount: number }[], today: Date): RaioX {
  const keys: string[] = [];
  for (let k = 1; k <= 6 && keys.length < 3; k++) {
    const key = monthKey(new Date(today.getFullYear(), today.getMonth() - k, 1));
    if (transactions.some((t) => t.date.startsWith(key))) keys.unshift(key);
  }
  const per = keys.map((key) => {
    const ts = transactions.filter((t) => t.date.startsWith(key));
    const out = sum(ts.filter((t) => t.kind === "gasto" && t.amount > 0).map((t) => t.amount)) + sum(ts.filter((t) => t.kind === "transferencia" && t.amount > 0).map((t) => t.amount));
    const inc = sum(ts.filter((t) => t.kind === "entrada").map((t) => -t.amount)) || incomeMonthly;
    const juros = sum(ts.filter((t) => t.categoryId === "juros" && t.kind === "gasto").map((t) => t.amount));
    return { hole: out - inc, juros, inc };
  });
  const n = per.length || 1;
  const interestMonthly = sum(per.map((p) => p.juros)) / n;
  const inc = sum(per.map((p) => p.inc)) / n || incomeMonthly;
  return { months: keys, avgHole: sum(per.map((p) => p.hole)) / n, interestMonthly, interestPct: inc ? (interestMonthly / inc) * 100 : 0, subsCount: subscriptions.length, subsTotal: sum(subscriptions.map((s) => s.amount)) };
}
