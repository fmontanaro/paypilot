// Motor de priorização: classifica cada compromisso do mês em Pagar agora, Parcelar,
// Negociar ou esperar e Cortar, sempre com o custo de cada escolha.
import type { Account, Commitment, Section } from "../schema";
import { brl, monthShort, pct } from "../format";
import { installmentCost, pmt, sum } from "./finance";

export const SECTIONS: { id: Section; label: string; short: string; icon: string; desc: string; tone: Tone }[] = [
  { id: "pagar", label: "Pagar agora", short: "Pagar agora", icon: "priority_high", desc: "Essenciais e com consequência grave", tone: "brand" },
  { id: "parcelar", label: "Parcelar", short: "Parcelar", icon: "calendar_view_month", desc: "Entra só a parcela neste mês, com custo", tone: "accent" },
  { id: "negociar", label: "Negociar ou esperar", short: "Negociar", icon: "handshake", desc: "Sai deste mês; veja o custo e o risco", tone: "warn" },
  { id: "cortar", label: "Cortar", short: "Cortar", icon: "content_cut", desc: "Sai do mês e vira economia", tone: "muted" },
];
export const SECTION_LABEL: Record<Section, string> = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label])) as Record<Section, string>;

export type Tone = "brand" | "accent" | "warn" | "risk" | "good" | "muted";

/** Multa padrão por atraso (2%) e juros de mora (1% a.m.). */
export const LATE_FEE = 0.02;
export const LATE_INTEREST = 0.01;

export interface ParcelOption {
  n: number;
  monthly: number;
  cost: number;
}
export interface DelayOption {
  cost: number;
  /** Texto do risco ou do combinado ("pode negativar seu nome", "Sem juros. Combine com ela."). */
  note: string;
  negativa: boolean;
}

export interface PriorityItem {
  id: string;
  name: string;
  amount: number;
  due: string;
  dueDate: Date | null;
  paid: boolean;
  essential: boolean;
  parcel: ParcelOption | null;
  delay: DelayOption | null;
  cuttable: boolean;
  allowed: Section[];
  section: Section;
  commitment: Commitment;
}

export interface ItemNote {
  text: string;
  tone: Tone;
  icon: string;
}

function riskText(c: Commitment, account?: Account): string {
  if (c.delayNote) return c.delayNote;
  switch (c.delayRisk) {
    case "negativar":
      return "pode negativar seu nome";
    case "rotativo":
      return `Entra no rotativo de ${pct(account?.monthlyRate ?? 0)} ao mês`;
    case "suspender":
      return "Atraso acima de 60 dias pode suspender o plano";
    case "cancelar_parcelamento":
      return "Atrasar 3 parcelas cancela o parcelamento";
    case "multa":
      return "Multa de 2%";
  }
  if (c.counterpart) return `Sem juros. Combine com ${c.counterpart}.`;
  if (c.kind === "fatura" && account?.monthlyRate) return `Entra no rotativo de ${pct(account.monthlyRate)} ao mês`;
  return "Multa de 2%";
}

/** Custo de adiar um mês (docs/motor-financeiro.md › Custo de adiar). */
export function delayCost(c: Commitment, account?: Account): number {
  if (c.delayCost != null) return c.delayCost;
  if (c.counterpart) return 0;
  if (c.kind === "fatura" && account?.monthlyRate) return c.amount * (account.monthlyRate / 100 + LATE_FEE);
  return c.amount * (LATE_FEE + LATE_INTEREST);
}

export function dueInfo(c: Commitment, today: Date): { due: string; date: Date | null } {
  const m = today.getMonth();
  const paid = isPaid(c, today);
  if (paid) return { due: `Pago em ${c.paidDay ?? 1} ${monthShort(m)}`, date: null };
  if (c.dueDay == null) return { due: c.dueText || "Ao longo do mês", date: null };
  const date = new Date(today.getFullYear(), m + (c.dueNextMonth ? 1 : 0), c.dueDay);
  const label = `${c.dueDay} ${monthShort(date.getMonth())}`;
  if (c.dueText) return { due: c.dueText.replace("{data}", label), date };
  if (!c.dueNextMonth && c.dueDay === today.getDate()) return { due: "Vence hoje", date };
  return { due: `Vence ${label}`, date };
}

export function isPaid(c: Commitment, today: Date): boolean {
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return c.paidMonth === key;
}

export function buildItems(commitments: Commitment[], accounts: Account[], decisions: Record<string, Section>, today: Date): PriorityItem[] {
  const acc = new Map(accounts.map((a) => [a.id, a]));
  return [...commitments]
    .sort((a, b) => a.sort - b.sort)
    .map((c) => {
      const account = c.accountId ? acc.get(c.accountId) : undefined;
      const paid = isPaid(c, today);
      const rate = account?.installmentRate ?? null;
      const parcel = !paid && c.parcelMonths && rate != null ? { n: c.parcelMonths, monthly: pmt(c.amount, rate, c.parcelMonths), cost: installmentCost(c.amount, rate, c.parcelMonths) } : null;
      const delay = !paid && c.delayable ? { cost: delayCost(c, account), note: riskText(c, account), negativa: c.delayRisk === "negativar" } : null;
      const cuttable = !paid && c.cuttable;
      const allowed: Section[] = paid ? [] : ["pagar"];
      if (parcel) allowed.push("parcelar");
      if (delay) allowed.push("negociar");
      if (cuttable) allowed.push("cortar");
      const wanted = decisions[c.id] ?? c.defaultSection ?? "pagar";
      const section: Section = paid ? "pagar" : allowed.includes(wanted) ? wanted : "pagar";
      const { due, date } = dueInfo(c, today);
      return { id: c.id, name: c.name, amount: c.amount, due, dueDate: date, paid, essential: !c.cuttable, parcel, delay, cuttable, allowed, section, commitment: c };
    });
}

/** Quanto o item pesa no mês conforme a seção. */
export function impact(it: PriorityItem, section: Section = it.section): number {
  if (section === "pagar") return it.amount;
  if (section === "parcelar") return it.parcel ? it.parcel.monthly : it.amount;
  return 0;
}

export function choiceCost(it: PriorityItem, section: Section = it.section): number {
  if (section === "parcelar") return it.parcel?.cost ?? 0;
  if (section === "negociar") return it.delay?.cost ?? 0;
  return 0;
}

export function withSection(items: PriorityItem[], id: string, to: Section): PriorityItem[] {
  return items.map((it) => (it.id === id && it.allowed.includes(to) ? { ...it, section: to } : it));
}

export interface PrioritySummary {
  income: number;
  planned: number;
  monthTotal: number;
  diff: number;
  fits: boolean;
  cost: number;
  covered: number;
}

export function summarize(items: PriorityItem[], income: number): PrioritySummary {
  const monthTotal = sum(items.map((it) => impact(it)));
  const planned = sum(items.map((it) => it.amount));
  const diff = income - monthTotal;
  return { income, planned, monthTotal, diff, fits: diff >= 0, cost: sum(items.map((it) => choiceCost(it))), covered: planned - monthTotal };
}

/** Observação de cada item dentro da sua seção. */
export function itemNote(it: PriorityItem, section: Section = it.section): ItemNote {
  if (it.paid) return { text: "Já pago", tone: "good", icon: "check_circle" };
  if (section === "pagar") {
    return it.delay?.negativa ? { text: "Atrasar pode negativar seu nome", tone: "risk", icon: "error" } : { text: "Essencial ou com consequência se atrasar", tone: "muted", icon: "info" };
  }
  if (section === "parcelar" && it.parcel) return { text: `${it.parcel.n}x de ${brl(it.parcel.monthly)} · juros ${brl(it.parcel.cost)}`, tone: "accent", icon: "calendar_view_month" };
  if (section === "negociar" && it.delay) {
    const { cost, note } = it.delay;
    if (cost > 0.5) return { text: `Adiar custa ${brl(cost)} em juros e ${note[0].toLowerCase()}${note.slice(1)}`, tone: it.delay.negativa ? "risk" : "warn", icon: "warning" };
    return { text: note, tone: "good", icon: "handshake" };
  }
  return { text: `Economia de ${brl(it.amount)} neste mês`, tone: "good", icon: "savings" };
}

export interface MoveOption {
  section: Section;
  allowed: boolean;
  impact: string;
  cost: string;
  tone: Tone;
}

/** Opções do sheet "Mover para", com impacto e custo de cada uma. */
export function moveOptions(it: PriorityItem): MoveOption[] {
  return SECTIONS.map((s) => {
    const ok = it.allowed.includes(s.id);
    if (s.id === "pagar") return { section: s.id, allowed: ok, impact: `Entra ${brl(it.amount)} neste mês`, cost: "Sem custo extra", tone: "muted" };
    if (s.id === "parcelar") {
      if (!it.parcel) return { section: s.id, allowed: false, impact: "Não dá para parcelar este item", cost: "", tone: "muted" };
      return { section: s.id, allowed: ok, impact: `${it.parcel.n}x de ${brl(it.parcel.monthly)} · entra ${brl(it.parcel.monthly)} neste mês`, cost: `Custa ${brl(it.parcel.cost)} em juros`, tone: "accent" };
    }
    if (s.id === "negociar") {
      if (!it.delay) return { section: s.id, allowed: false, impact: "Não dá para adiar este item", cost: "", tone: "muted" };
      const { cost, note } = it.delay;
      return { section: s.id, allowed: ok, impact: "Sai deste mês", cost: cost > 0.5 ? `Adiar custa ${brl(cost)} em juros e ${note[0].toLowerCase()}${note.slice(1)}` : note, tone: it.delay.negativa ? "risk" : cost > 0.5 ? "warn" : "good" };
    }
    if (!it.cuttable) return { section: s.id, allowed: false, impact: "Item essencial, não dá para cortar", cost: "", tone: "muted" };
    return { section: s.id, allowed: ok, impact: `Economia de ${brl(it.amount)} neste mês`, cost: "", tone: "good" };
  });
}

export interface Suggestion {
  id: string;
  to: Section;
  title: string;
  detail: string;
  relief: number;
  cost: number;
}

/**
 * Até 3 movimentos para cobrir o buraco, do menor custo por real aliviado para o maior
 * (adiamentos combinados sem custo vêm primeiro). Nunca sugere adiar algo com custo nem cortar essencial.
 */
export function suggestions(items: PriorityItem[], today: Date, max = 3): Suggestion[] {
  const nextMonth = MONTHS_LONG[(today.getMonth() + 1) % 12];
  const out: Suggestion[] = [];
  for (const it of items) {
    if (it.section !== "pagar" || it.paid) continue;
    if (it.delay && it.delay.cost <= 0.5 && it.commitment.counterpart) {
      out.push({ id: it.id, to: "negociar", title: `Combinar com ${it.commitment.counterpart} para ${nextMonth}`, detail: `−${brl(it.amount)} neste mês · sem custo`, relief: it.amount, cost: 0 });
    } else if (it.parcel) {
      const relief = it.amount - it.parcel.monthly;
      out.push({ id: it.id, to: "parcelar", title: `Parcelar a ${it.name.toLowerCase().startsWith("fatura") ? "f" + it.name.slice(1) : it.name} em ${it.parcel.n}x`, detail: `−${brl(relief)} neste mês · custa ${brl(it.parcel.cost)} em juros`, relief, cost: it.parcel.cost });
    }
  }
  return out.sort((a, b) => a.cost / a.relief - b.cost / b.relief || b.relief - a.relief).slice(0, max);
}

const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
