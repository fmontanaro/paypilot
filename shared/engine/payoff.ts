// Plano de quitação: avalanche (da dívida mais cara para a mais barata) e fases da jornada.
import type { Account, PersonalDebt, PersonalDebtPayment } from "../schema";
import { monthShort, monthYear } from "../format";
import { addMonths, sum } from "./finance";

export interface Debt {
  id: string;
  name: string;
  kind: "rotativo" | "cheque" | "emprestimo" | "pessoal";
  balance: number;
  /** % ao mês */
  rate: number;
  /** Mínimo mensal (parcela, 15% do rotativo, juros do cheque, combinado). */
  minPayment: number;
  accountId?: string;
}

export const CARD_MIN_PCT = 0.15;
/** Cheque especial: juros do mês + 10% do saldo. */
export const CHEQUE_MIN_PCT = 0.1;

export function debtsFrom(accounts: Account[], personal: PersonalDebt[], payments: PersonalDebtPayment[]): Debt[] {
  const out: Debt[] = [];
  for (const a of accounts) {
    const bal = a.debtBalance ?? 0;
    if (bal <= 0) continue;
    const rate = a.monthlyRate ?? 0;
    if (a.kind === "cartao") out.push({ id: a.id, accountId: a.id, name: `Rotativo ${a.institution}`, kind: "rotativo", balance: bal, rate, minPayment: bal * CARD_MIN_PCT });
    else if (a.kind === "cheque_especial") out.push({ id: a.id, accountId: a.id, name: a.name, kind: "cheque", balance: bal, rate, minPayment: (bal * rate) / 100 + bal * CHEQUE_MIN_PCT });
    else if (a.kind === "emprestimo") out.push({ id: a.id, accountId: a.id, name: a.name, kind: "emprestimo", balance: bal, rate, minPayment: a.installmentAmount ?? bal / 24 });
  }
  for (const p of personal) {
    const paid = sum(payments.filter((x) => x.debtId === p.id).map((x) => x.amount));
    const bal = p.principal - paid;
    if (bal <= 0) continue;
    out.push({ id: p.id, name: `${p.relation ? `Empréstimo do ${p.creditor} (${p.relation})` : p.creditor}`, kind: "pessoal", balance: bal, rate: p.monthlyRate ?? 0, minPayment: p.plannedMonthly });
  }
  return out;
}

export interface DebtResult {
  id: string;
  name: string;
  rate: number;
  balance: number;
  /** Mês (0 = mês atual) em que a dívida termina. */
  payoffIndex: number;
  payoffDate: Date;
  interest: number;
  monthlyToDebt: number;
}

export interface PayoffResult {
  debts: DebtResult[];
  totalDebt: number;
  totalInterest: number;
  debtFree: Date | null;
  months: number;
  minOnlyInterest: number;
  savingsVsMin: number;
  budget: number;
}

const MAX_MONTHS = 600;

interface SimState {
  d: Debt;
  bal: number;
  interest: number;
  end: number | null;
  firstPay: number;
}

function simulate(debts: Debt[], budgetFor: (month: number) => number, avalanche: boolean) {
  const st: SimState[] = debts.map((d) => ({ d, bal: d.balance, interest: 0, end: null, firstPay: 0 }));
  let m = 0;
  for (; m < MAX_MONTHS && st.some((s) => s.bal > 0.005); m++) {
    for (const s of st) {
      if (s.bal <= 0.005) continue;
      const j = (s.bal * s.d.rate) / 100;
      s.interest += j;
      s.bal += j;
    }
    let pool = Math.max(budgetFor(m), 0);
    const live = st.filter((s) => s.bal > 0.005);
    const minSum = sum(live.map((s) => Math.min(s.bal, s.d.minPayment)));
    pool = Math.max(pool, minSum);
    for (const s of live) {
      const p = Math.min(s.bal, s.d.minPayment, pool);
      s.bal -= p;
      pool -= p;
      if (m === 0) s.firstPay += p;
    }
    if (avalanche) {
      const order = live.filter((s) => s.bal > 0.005).sort((a, b) => b.d.rate - a.d.rate || a.bal - b.bal);
      for (const s of order) {
        if (pool <= 0) break;
        const p = Math.min(s.bal, pool);
        s.bal -= p;
        pool -= p;
        if (m === 0) s.firstPay += p;
      }
    }
    for (const s of st) if (s.end == null && s.bal <= 0.005) s.end = m;
  }
  return { st, months: m };
}

export function defaultBudget(debts: Debt[]): number {
  return sum(debts.map((d) => d.minPayment));
}

/**
 * Simula a avalanche. `budget` é o valor mensal para dívidas (nunca menos que a soma dos mínimos);
 * `reduce` tira um valor durante alguns meses (ex.: uma meta) para medir o atraso.
 */
export function payoffPlan(debts: Debt[], today: Date, budget?: number, reduce?: { amount: number; months: number }): PayoffResult {
  const b = budget ?? defaultBudget(debts);
  const budgetFor = (m: number) => b - (reduce && m < reduce.months ? reduce.amount : 0);
  const { st, months } = simulate(debts, budgetFor, true);
  // "Só o mínimo": cada dívida recebe apenas o próprio mínimo, sem direcionar a sobra.
  const minSim = simulate(debts, () => 0, false);
  const minOnlyInterest = sum(minSim.st.map((s) => s.interest));
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const res: DebtResult[] = st
    .map((s) => ({
      id: s.d.id,
      name: s.d.name,
      rate: s.d.rate,
      balance: s.d.balance,
      payoffIndex: s.end ?? MAX_MONTHS,
      payoffDate: addMonths(start, s.end ?? MAX_MONTHS),
      interest: s.interest,
      monthlyToDebt: s.firstPay,
    }))
    .sort((a, b) => b.rate - a.rate || a.payoffIndex - b.payoffIndex);
  const totalInterest = sum(res.map((r) => r.interest));
  const last = Math.max(-1, ...res.map((r) => r.payoffIndex));
  return {
    debts: res,
    totalDebt: sum(debts.map((d) => d.balance)),
    totalInterest,
    debtFree: res.length ? addMonths(start, last) : null,
    months,
    minOnlyInterest,
    savingsVsMin: Math.max(0, minOnlyInterest - totalInterest),
    budget: Math.max(b, defaultBudget(debts)),
  };
}

export interface Phase {
  n: 1 | 2 | 3 | 4;
  label: string;
  when: string;
  current: boolean;
}

export const PHASE_LABELS = ["Fechar o mês", "Estabilizar", "Quitar", "Gerar sobra"] as const;
export const PHASE_DESC = [
  "Fazer {mes} caber na renda sem pegar dívida cara nova.",
  "Montar um colchão de um mês e parar de rolar dívida.",
  "Atacar as dívidas da mais cara para a mais barata.",
  "Sobra todo mês. O destino dela é decisão sua.",
];

/**
 * Fases da jornada: 1 enquanto o mês não cabe → 2 enquanto cabe mas ainda paga para rolar
 * (parcelar ou adiar com custo, juros de rotativo no mês) → 3 até quitar → 4 sem dívidas.
 */
export function phases(today: Date, monthFits: boolean, debtFree: Date | null, rolling = false): { list: Phase[]; current: number } {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const cur = !monthFits ? 1 : !debtFree ? 4 : rolling ? 2 : 3;
  const p2a = addMonths(start, 1);
  const p2b = addMonths(start, 2);
  const p3a = addMonths(start, 3);
  const free = debtFree ?? addMonths(start, 3);
  const p4 = addMonths(free, 1);
  const when = [
    `${monthShort(start.getMonth())} ${start.getFullYear()}`,
    `${monthShort(p2a.getMonth())}–${monthShort(p2b.getMonth())} ${p2b.getFullYear()}`,
    `${monthShort(p3a.getMonth())} ${p3a.getFullYear()}–${monthYear(free)}`,
    `a partir de ${monthYear(p4)}`,
  ];
  const list = PHASE_LABELS.map((label, i) => ({ n: (i + 1) as 1 | 2 | 3 | 4, label, when: when[i], current: i + 1 === cur }));
  return { list, current: cur };
}
