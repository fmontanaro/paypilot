// Otimizador de rolagem: compara rotas para pagar uma fatura com o crédito atual.
// Nunca incentiva rolar: a única rota que recebe selo é a que termina a dívida (parcelamento).
import type { Account, Commitment, Income, Transaction } from "../schema";
import { brl, monthKey, monthLong, monthShort, pct } from "../format";
import { addMonths, daysBetween, installmentCost, nextDay, pmt, sum } from "./finance";

export interface Route {
  letter: "A" | "B" | "C";
  kind: "parcelar" | "outro_cartao" | "cheque";
  name: string;
  cost: number;
  daysLabel: string;
  days: number;
  nextMonth: number;
  warn: string;
  good: boolean;
  best: boolean;
}

export function dueDateOf(c: Commitment, today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() + (c.dueNextMonth ? 1 : 0), c.dueDay ?? today.getDate());
}

/** Data de vencimento da fatura em que cai uma compra feita em `purchase` no cartão `a`. */
export function statementDueFor(a: Account, purchase: Date): Date {
  const closing = nextDay(new Date(purchase.getFullYear(), purchase.getMonth(), purchase.getDate() + 1), a.closingDay ?? 1);
  const due = new Date(closing.getFullYear(), closing.getMonth() + ((a.dueDay ?? 1) <= (a.closingDay ?? 1) ? 1 : 0), a.dueDay ?? 1);
  return due;
}

const available = (a: Account) => (a.creditLimit ?? 0) - (a.used ?? 0);

export function routes(c: Commitment, accounts: Account[], incomes: Income[], today: Date): Route[] {
  const acc = accounts.find((a) => a.id === c.accountId);
  const V = c.amount;
  const due = dueDateOf(c, today);
  const out: Route[] = [];
  const short = c.name.replace(/^Fatura /, "");

  if (acc?.installmentRate != null && c.parcelMonths) {
    const n = c.parcelMonths;
    const P = pmt(V, acc.installmentRate, n);
    const end = addMonths(due, n);
    out.push({ letter: "A", kind: "parcelar", name: `Parcelar a fatura ${short} em ${n}x`, cost: installmentCost(V, acc.installmentRate, n), days: n * 30, daysLabel: `${n * 30} dias, em parcelas`, nextMonth: P, warn: `Custo previsível e a dívida termina em ${monthLong(end.getMonth())}.`, good: true, best: false });
  }

  const others = accounts.filter((a) => a.kind === "cartao" && a.id !== c.accountId && available(a) >= V && a.closingDay && a.dueDay);
  if (others.length) {
    const scored = others.map((a) => ({ a, due2: statementDueFor(a, due) })).sort((x, y) => y.due2.getTime() - x.due2.getTime());
    const { a, due2 } = scored[0];
    const days = daysBetween(due, due2);
    const rateTxt = a.monthlyRate ? `vira rotativo de ${pct(a.monthlyRate)} ao mês` : "vira rotativo";
    out.push({ letter: "B", kind: "outro_cartao", name: `Pagar com o limite do cartão ${a.institution}`, cost: 0, days, daysLabel: `${days} dias`, nextMonth: V, warn: `Só empurra a conta: se não pagar inteira em ${monthLong(due2.getMonth())}, ${rateTxt}.`, good: false, best: false });
  }

  const cheque = accounts.find((a) => a.kind === "cheque_especial" && available(a) >= V);
  const payDays = incomes.filter((i) => i.recurring).map((i) => i.payDay);
  if (cheque?.monthlyRate && payDays.length) {
    const nextIncome = payDays.map((d) => nextDay(due, d)).sort((x, y) => x.getTime() - y.getTime())[0];
    const days = Math.max(1, daysBetween(due, nextIncome));
    const cost = ((V * cheque.monthlyRate) / 100 / 30) * days;
    out.push({ letter: "C", kind: "cheque", name: `Usar o cheque especial por ${days} dias`, cost, days, daysLabel: `${days} dias`, nextMonth: V + cost, warn: `Caro e curto: cobre ${days} dias até a renda do dia ${nextIncome.getDate()}. Prefira a rota com saída.`, good: false, best: false });
  }

  const withExit = out.filter((r) => r.kind === "parcelar");
  if (withExit.length) {
    const best = withExit.sort((a, b) => a.cost - b.cost)[0];
    best.best = true;
  }
  return out.map((r, i) => ({ ...r, letter: (["A", "B", "C"] as const)[i] }));
}

export interface RolloverMonth {
  key: string;
  label: string;
  cost: number;
}

/** Custo da rolagem: juros e tarifas pagos por mês (últimos 6 meses, o atual por último). */
export function rolloverHistory(transactions: Transaction[], today: Date, months = 6): RolloverMonth[] {
  const out: RolloverMonth[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(today.getFullYear(), today.getMonth() - k, 1);
    const key = monthKey(d);
    const cost = sum(transactions.filter((t) => t.categoryId === "juros" && t.kind === "gasto" && t.date.startsWith(key)).map((t) => t.amount));
    out.push({ key, label: monthShort(d.getMonth()), cost });
  }
  return out;
}

export function rolloverTrend(hist: RolloverMonth[]): { current: number; previous: number; delta: number; pct: number } {
  const current = hist[hist.length - 1]?.cost ?? 0;
  const previous = hist[hist.length - 2]?.cost ?? 0;
  const delta = current - previous;
  return { current, previous, delta, pct: previous ? (delta / previous) * 100 : 0 };
}

export const routeCostLabel = (r: Route) => (r.cost > 0.5 ? brl(r.cost) : "R$ 0 agora");
