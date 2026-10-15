// Junta os dados crus do usuário (AppData) e devolve as visões que as telas usam.
// Roda igual no servidor (assistente, alertas) e no cliente (recalcular na hora).
import type {
  Account,
  Budget,
  CategoryRule,
  ChatMessage,
  Commitment,
  Connection,
  ExpenseGroup,
  Goal,
  GoalInvite,
  GoalMember,
  GroupObligation,
  ImportRow,
  Income,
  Leak,
  PersonalDebt,
  PersonalDebtPayment,
  PublicUser,
  RolloverChoice,
  Section,
  Snapshot,
  Subscription,
  Transaction,
  TransactionSplit,
  WhatsappLink,
} from "../schema";
import { fromIso, monthKey } from "../format";
import { ceilings, type CeilingView } from "./ceilings";
import { sum } from "./finance";
import { leakTotals, type LeakTotals } from "./leaks";
import { debtsFrom, payoffPlan, phases, type Debt, type PayoffResult, type Phase } from "./payoff";
import { buildItems, summarize, type PriorityItem, type PrioritySummary } from "./priorities";

/** Tudo o que o cliente recebe em GET /api/snapshot. */
export interface AppData {
  today: string;
  user: PublicUser;
  incomes: Income[];
  connections: Connection[];
  accounts: Account[];
  imports: ImportRow[];
  transactions: Transaction[];
  splits: TransactionSplit[];
  rules: CategoryRule[];
  budgets: Budget[];
  subscriptions: Subscription[];
  leaks: Leak[];
  commitments: Commitment[];
  decisions: Record<string, Section>;
  rolloverChoices: RolloverChoice[];
  snapshots: Snapshot[];
  personalDebts: PersonalDebt[];
  personalDebtPayments: PersonalDebtPayment[];
  groups: ExpenseGroup[];
  obligations: GroupObligation[];
  goals: Goal[];
  goalMembers: GoalMember[];
  goalInvites: GoalInvite[];
  whatsapp: Omit<WhatsappLink, "codeHash"> | null;
  chatCount: number;
}

export interface Context {
  data: AppData;
  today: Date;
  month: string;
  income: number;
  items: PriorityItem[];
  summary: PrioritySummary;
  ceilings: CeilingView[];
  leaks: LeakTotals;
  debts: Debt[];
  payoff: PayoffResult;
  phases: Phase[];
  phase: number;
  accountLabel: (accountId: string | null) => string;
  accountShort: (accountId: string | null) => string;
  hasData: boolean;
}

export function monthlyIncome(incomes: Income[]): number {
  return sum(incomes.filter((i) => i.recurring).map((i) => i.amount));
}

export function makeAccountLabel(accounts: Account[]) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const label = (id: string | null) => {
    const a = id ? byId.get(id) : undefined;
    if (!a) return "Lançamento manual";
    if (a.label) return a.label;
    if (a.kind === "conta") return `Conta ${a.institution}`;
    if (a.kind === "cartao_manual") return a.name;
    if (a.kind === "emprestimo") return a.name;
    return a.institution;
  };
  const short = (id: string | null) => {
    const a = id ? byId.get(id) : undefined;
    if (!a) return "Manual";
    if (a.kind === "conta") return `Conta ${a.institution}`;
    return a.institution;
  };
  return { label, short };
}

export function buildContext(data: AppData, decisionsOverride?: Record<string, Section>): Context {
  const today = fromIso(data.today);
  const income = monthlyIncome(data.incomes);
  const items = buildItems(data.commitments, data.accounts, decisionsOverride ?? data.decisions, today);
  const summary = summarize(items, income);
  const debts = debtsFrom(data.accounts, data.personalDebts, data.personalDebtPayments);
  const payoff = payoffPlan(debts, today, data.user.prefs?.debtBudget);
  const key = monthKey(today);
  const rolling = summary.cost > 0.5 || data.transactions.some((t) => t.categoryId === "juros" && t.kind === "gasto" && t.date.startsWith(key) && /juros|iof|rotativo/i.test(t.description));
  const ph = phases(today, summary.fits, payoff.debtFree, rolling);
  const { label, short } = makeAccountLabel(data.accounts);
  return {
    data,
    today,
    month: monthKey(today),
    income,
    items,
    summary,
    ceilings: ceilings(data.budgets, data.transactions, today),
    leaks: leakTotals(data.leaks),
    debts,
    payoff,
    phases: ph.list,
    phase: ph.current,
    accountLabel: label,
    accountShort: short,
    hasData: data.transactions.length > 0 || data.commitments.length > 0,
  };
}
