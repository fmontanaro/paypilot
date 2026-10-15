// Início: o que fazer agora, próximos vencimentos e progresso do plano.
import { brl, dayMonth, daysInMonth, monthKey, monthLong, monthShort, monthYear } from "../format";
import { daysBetween } from "./finance";
import type { Context } from "./context";

import { impact } from "./priorities";
import { statementDueFor } from "./rollover";

export interface Action {
  kind: "vence" | "economia" | "atencao";
  icon: string;
  tone: "risk" | "good" | "warn";
  tag: string;
  title: string;
  meta: string;
  cta: string;
  to: [string, string];
}

export function actions(ctx: Context, max = 3): Action[] {
  const out: Action[] = [];
  const { today } = ctx;
  const urgent = ctx.items
    .filter((it) => !it.paid && it.section === "pagar" && it.dueDate)
    .map((it) => ({ it, days: daysBetween(today, it.dueDate!) }))
    .filter((x) => x.days >= 0 && x.days <= 3)
    .sort((a, b) => a.days - b.days || Number(b.it.delay?.negativa) - Number(a.it.delay?.negativa))[0];
  if (urgent) {
    const { it, days } = urgent;
    const when = days === 0 ? "vence hoje" : days === 1 ? "vence amanhã" : `vence em ${days} dias`;
    const risk = it.delay && it.delay.cost > 0.5 ? ` · atrasar custa ${brl(it.delay.cost)} em juros${it.delay.negativa ? " e pode negativar seu nome" : ""}.` : ".";
    out.push({ kind: "vence", icon: "event", tone: days === 0 ? "risk" : "warn", tag: days === 0 ? "Vence hoje" : "Vence em breve", title: `${it.name} ${when}`, meta: `${brl(it.amount)}${risk}`, cta: "Ver nas prioridades", to: ["plano", "prioridades"] });
  }
  const subs = ctx.data.leaks.filter((l) => l.status === "aberto" && l.kind === "sub");
  if (subs.length) {
    const total = subs.reduce((a, l) => a + l.amount, 0);
    const rep = subs.find((l) => /repetido/.test(l.reason));
    out.push({ kind: "economia", icon: "savings", tone: "good", tag: "Economia", title: `Você pode economizar ${brl(total)}/mês cancelando ${subs.length} assinatura${subs.length > 1 ? "s" : ""}`, meta: rep ? `Inclui um ${rep.reason.split(" repetido")[0].toLowerCase()} repetido em outro cartão.` : "Encontradas pelo caçador de vazamentos.", cta: "Revisar assinaturas", to: ["gastos", "vazamentos"] });
  }
  const dim = daysInMonth(today);
  const atLimit = ctx.ceilings.filter((c) => c.status === "limite" && today.getDate() < dim).sort((a, b) => b.pct - a.pct)[0];
  if (atLimit) {
    out.push({ kind: "atencao", icon: "speed", tone: "warn", tag: "Atenção", title: `Teto de ${atLimit.label} em ${Math.round(atLimit.pct * 100)}% e ainda é dia ${today.getDate()}`, meta: `Restam ${brl(Math.max(0, atLimit.limit - atLimit.spent))} até o dia ${dim}. No ritmo atual, o mês fecha em ${brl(atLimit.projection)}.`, cta: "Ver teto", to: ["gastos", "tetos"] });
  }
  return out.slice(0, max);
}

export interface Upcoming {
  date: Date;
  name: string;
  amount: number;
  tag: string;
  tone: "risk" | "warn" | "muted" | "";
  icon: string;
}

/** Compromissos não pagos e fechamentos de cartão nos próximos `days` dias. */
export function upcoming(ctx: Context, days = 14): Upcoming[] {
  const { today } = ctx;
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days - 1);
  const out: Upcoming[] = [];
  for (const it of ctx.items) {
    if (it.paid || !it.dueDate || it.section === "negociar" || it.section === "cortar") continue;
    if (it.dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate()) || it.dueDate > end) continue;
    const d = daysBetween(today, it.dueDate);
    out.push({ date: it.dueDate, name: it.name, amount: impact(it), tag: d === 0 ? "Vence hoje" : d <= 3 ? "Em até 3 dias" : "", tone: d === 0 ? "risk" : d <= 3 ? "warn" : "", icon: d === 0 ? "error" : "schedule" });
  }
  for (const a of ctx.data.accounts) {
    if (a.kind !== "cartao" || !a.closingDay) continue;
    for (const off of [0, 1]) {
      const c = new Date(today.getFullYear(), today.getMonth() + off, a.closingDay);
      if (c < new Date(today.getFullYear(), today.getMonth(), today.getDate()) || c > end) continue;
      const nextDue = statementDueFor(a, c);
      out.push({ date: c, name: `Fechamento do cartão ${a.institution}`, amount: 0, tag: `Compras depois daqui vão para ${monthLong(nextDue.getMonth())}`, tone: "muted", icon: "event" });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function upcomingLabel(u: Upcoming, today: Date): string {
  return daysBetween(today, u.date) === 0 ? "Hoje" : dayMonth(u.date);
}

export interface PlanProgress {
  totalDebt: number;
  debtDelta: number | null;
  prevMonthLabel: string;
  payoffLabel: string;
  earlierMonths: number;
}

export function planProgress(ctx: Context): PlanProgress {
  const { today } = ctx;
  const prevKey = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const prev = ctx.data.snapshots.find((s) => s.month === prevKey);
  const free = ctx.payoff.debtFree;
  let earlier = 0;
  if (prev?.payoffMonth && free) {
    const [y, m] = prev.payoffMonth.split("-").map(Number);
    earlier = (y - free.getFullYear()) * 12 + (m - 1 - free.getMonth());
  }
  return {
    totalDebt: ctx.payoff.totalDebt,
    debtDelta: prev ? ctx.payoff.totalDebt - prev.totalDebt : null,
    prevMonthLabel: monthShort(today.getMonth() - 1),
    payoffLabel: free ? monthYear(free) : "—",
    earlierMonths: earlier,
  };
}

