// Metas: valor mensal, de onde tirar o dinheiro e o impacto no plano de quitação.
import type { Budget, Goal, GoalMember, Leak } from "../schema";
import { brl, monthShort, monthYear } from "../format";
import { addMonths, round2, sum } from "./finance";
import { payoffPlan, type Debt } from "./payoff";

export interface GoalView {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  monthly: number;
  until: Date;
  pct: number;
  isGroup: boolean;
  withNames: string[];
}

export function goalUntil(g: Pick<Goal, "startMonth" | "months">): Date {
  const [y, m] = g.startMonth.split("-").map(Number);
  return addMonths(new Date(y, m - 1, 1), g.months - 1);
}

export function goalView(g: Goal, members: GoalMember[], today: Date): GoalView {
  const until = goalUntil(g);
  const [startYear, startMonth] = g.startMonth.split("-").map(Number);
  const firstContribution = Math.max(startYear * 12 + startMonth - 1, today.getFullYear() * 12 + today.getMonth());
  const monthsLeft = Math.max(1, until.getFullYear() * 12 + until.getMonth() - firstContribution + 1);
  const mine = members.filter((m) => m.goalId === g.id);
  // O total da meta é mantido transacionalmente pelo histórico. Pode incluir
  // saldo legado sem participante identificado, que não deve desaparecer.
  const saved = g.isGroup && !g.historyStartedAt && mine.length ? sum(mine.map((m) => m.saved)) : g.saved;
  return {
    id: g.id,
    name: g.name,
    icon: g.icon,
    target: g.target,
    saved,
    monthly: Math.max(0, g.target - saved) / monthsLeft,
    until,
    pct: g.target ? saved / g.target : 0,
    isGroup: g.isGroup,
    withNames: mine.filter((m) => !m.isMe).map((m) => m.name),
  };
}

export interface MoneySource {
  key: string;
  title: string;
  detail: string;
  amount: number;
}

/** De onde tirar: assinaturas sem uso abertas e baixar tetos variáveis em ⌊teto ÷ 6 ÷ 100⌋ × 100. */
export function moneySources(leaks: Leak[], budgets: Budget[]): MoneySource[] {
  const out: MoneySource[] = [];
  const subs = leaks.filter((l) => l.kind === "sub" && l.status === "aberto");
  if (subs.length) out.push({ key: "sub", title: `Cancelar ${subs.length} assinatura${subs.length > 1 ? "s" : ""} sem uso`, detail: "Já encontradas pelo caçador de vazamentos", amount: round2(sum(subs.map((l) => l.amount))) });
  const variable = ["restaurantes", "compras", "lazer"];
  for (const b of budgets.filter((x) => variable.includes(x.categoryId))) {
    const cut = Math.floor(b.monthlyLimit / 6 / 100) * 100;
    if (cut <= 0) continue;
    out.push({ key: `teto:${b.id}`, title: `Baixar o teto de ${b.label.toLowerCase()}`, detail: `De ${brl(b.monthlyLimit)} para ${brl(b.monthlyLimit - cut)}`, amount: cut });
  }
  return out;
}

export interface GoalCalc {
  monthly: number;
  until: Date;
  covered: number;
  gap: number;
  delayMonths: number;
  trade: string;
}

/** Calcula a meta nova: valor mensal, cobertura pelas fontes e atraso da dívida mais cara. */
export function goalCalc(target: number, months: number, chosen: MoneySource[], debts: Debt[], debtBudget: number | undefined, today: Date): GoalCalc {
  const monthly = months > 0 ? target / months : target;
  const covered = round2(sum(chosen.map((s) => s.amount)));
  const gap = Math.max(0, monthly - covered);
  const until = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), Math.max(0, months - 1));
  let delayMonths = 0;
  let trade = "esta meta não atrasa o plano de quitação.";
  if (gap > 0 && debts.length) {
    const base = payoffPlan(debts, today, debtBudget);
    const top = base.debts[0];
    const after = payoffPlan(debts, today, debtBudget, { amount: gap, months });
    const topAfter = after.debts.find((d) => d.id === top.id)!;
    delayMonths = Math.max(0, topAfter.payoffIndex - top.payoffIndex);
    if (delayMonths > 0) {
      trade = `separar ${brl(gap)}/mês da sobra atrasa a quitação do ${top.name.replace(/^Rotativo/, "rotativo")} em ${delayMonths} ${delayMonths === 1 ? "mês" : "meses"} (de ${monthShort(top.payoffDate.getMonth())} para ${monthYear(topAfter.payoffDate)}).`;
    }
  }
  return { monthly, until, covered, gap, delayMonths, trade };
}

/** Divisão de meta em grupo: igual ou proporcional à renda informada. */
export function groupShares(members: GoalMember[], monthly: number, mode: "igual" | "prop"): { id: string; share: number; pct: number }[] {
  const n = members.length || 1;
  const totalIncome = sum(members.map((m) => m.income ?? 0));
  return members.map((m) => {
    const p = mode === "igual" || !totalIncome ? 1 / n : (m.income ?? 0) / totalIncome;
    return { id: m.id, share: monthly * p, pct: p };
  });
}
