// Matemática financeira básica. Taxas em % ao mês.

/** Parcela de um financiamento (tabela Price). */
export function pmt(value: number, monthlyRatePct: number, n: number): number {
  if (n <= 0) return value;
  const i = monthlyRatePct / 100;
  if (i === 0) return value / n;
  return (value * i) / (1 - Math.pow(1 + i, -n));
}

/** Juros totais de parcelar: n × parcela − valor. */
export function installmentCost(value: number, monthlyRatePct: number, n: number): number {
  return pmt(value, monthlyRatePct, n) * n - value;
}

export const DAY_MS = 86_400_000;

/** Dias de calendário entre duas datas (b − a). */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

/** Data do dia `day` no mês de `ref` + `offset` meses (ajusta para o último dia do mês). */
export function dayInMonth(ref: Date, day: number, offset = 0): Date {
  const y = ref.getFullYear();
  const m = ref.getMonth() + offset;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}

/** Próxima ocorrência do dia `day` a partir de `from` (inclusive). */
export function nextDay(from: Date, day: number): Date {
  const d = dayInMonth(from, day);
  return d.getTime() >= new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() ? d : dayInMonth(from, day, 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const round2 = (v: number) => Math.round(v * 100) / 100;
