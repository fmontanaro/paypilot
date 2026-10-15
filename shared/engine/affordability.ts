// "Posso gastar X?": impacto no mês, no teto da categoria e no plano de quitação.
import type { CeilingView } from "./ceilings";
import type { PayoffResult } from "./payoff";

export interface Affordability {
  amount: number;
  diffBefore: number;
  diffAfter: number;
  ceiling: { label: string; overflow: number; safe: number } | null;
  payoffDelayDays: number;
  topDebtName: string | null;
  fits: boolean;
}

export function affordability(amount: number, monthDiff: number, ceiling: CeilingView | null, payoff: PayoffResult | null): Affordability {
  const top = payoff?.debts[0] ?? null;
  const perDay = top && top.monthlyToDebt > 0 ? top.monthlyToDebt / 30 : 0;
  return {
    amount,
    diffBefore: monthDiff,
    diffAfter: monthDiff - amount,
    ceiling: ceiling ? { label: ceiling.label, overflow: Math.max(0, ceiling.spent + amount - ceiling.limit), safe: Math.max(0, ceiling.limit - ceiling.spent) } : null,
    payoffDelayDays: perDay ? Math.ceil(amount / perDay) : 0,
    topDebtName: top?.name ?? null,
    fits: monthDiff - amount >= 0 && (!ceiling || ceiling.spent + amount <= ceiling.limit),
  };
}
