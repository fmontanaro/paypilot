// Formatação em português do Brasil. Arredondamento só acontece aqui, na exibição.

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** R$ 1.234 (sem centavos) ou R$ 1.234,56 (com centavos). */
export function brl(value: number, cents = false): string {
  const v = Number.isFinite(value) ? value : 0;
  const s = Math.abs(v).toLocaleString("pt-BR", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  return (v < 0 && Math.round(Math.abs(v) * (cents ? 100 : 1)) !== 0 ? "−" : "") + "R$ " + s;
}

/** Percentual com vírgula: 14,5% */
export function pct(value: number, digits = 1): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits }) + "%";
}

/** Taxa ao mês: "14,5% a.m." ou "sem juros". */
export function rateLabel(monthlyRate: number | null | undefined): string {
  if (!monthlyRate) return "sem juros";
  return pct(monthlyRate) + " a.m.";
}

export const monthShort = (m: number) => MONTHS_SHORT[((m % 12) + 12) % 12];
export const monthLong = (m: number) => MONTHS_LONG[((m % 12) + 12) % 12];
export const weekday = (d: Date) => WEEKDAYS[d.getDay()];

/** "14 out" */
export function dayMonth(d: Date): string {
  return `${d.getDate()} ${monthShort(d.getMonth())}`;
}

/** "set 2028" */
export function monthYear(d: Date): string {
  return `${monthShort(d.getMonth())} ${d.getFullYear()}`;
}

/** "14/10/2026" */
export function dateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

/** "Outubro de 2026" */
export function monthTitle(d: Date): string {
  const m = monthLong(d.getMonth());
  return `${m[0].toUpperCase()}${m.slice(1)} de ${d.getFullYear()}`;
}

/** "Quinta, 15 de outubro" */
export function longDay(d: Date): string {
  return `${weekday(d)}, ${d.getDate()} de ${monthLong(d.getMonth())}`;
}

/** Chave de mês "2026-10". */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Lê "1.234,56", "1234.56", "R$ 1.500" → número. */
export function parseMoney(input: string | number): number {
  if (typeof input === "number") return input;
  let s = String(input).replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Data ISO (yyyy-mm-dd) em horário local, sem fuso. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromIso(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || "")).toUpperCase();
}
