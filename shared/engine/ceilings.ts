// Tetos por categoria com ritmo do mês e projeção.
import type { Budget, Transaction } from "../schema";
import { daysInMonth, monthKey } from "../format";
import { category } from "../categories";
import { sum } from "./finance";

export interface CeilingView {
  id: string;
  categoryId: string;
  label: string;
  limit: number;
  spent: number;
  pct: number;
  projection: number;
  /** Fração do mês já passada (0–1), posição do marcador de ritmo esperado. */
  expectedPace: number;
  status: "limite" | "acima" | "ritmo";
  over: boolean;
}

export function spentByCategory(transactions: Transaction[], today: Date, monthOffset = 0): Record<string, number> {
  const ref = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const key = monthKey(ref);
  const out: Record<string, number> = {};
  for (const t of transactions) {
    if (t.kind !== "gasto" || t.amount <= 0) continue;
    if (!t.date.startsWith(key)) continue;
    if (monthOffset === 0 && Number(t.date.slice(8, 10)) > today.getDate()) continue;
    out[t.categoryId] = (out[t.categoryId] || 0) + t.amount;
  }
  return out;
}

export function ceilingView(b: Budget, spent: number, today: Date): CeilingView {
  const day = today.getDate();
  const dim = daysInMonth(today);
  // Categorias fixas são cobradas uma vez no mês: não faz sentido projetar pelo ritmo.
  const projection = category(b.categoryId).fixed ? spent : day > 0 ? (spent / day) * dim : spent;
  const pct = b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0;
  const over = projection > b.monthlyLimit;
  const status = pct >= 0.9 ? "limite" : over ? "acima" : "ritmo";
  return { id: b.id, categoryId: b.categoryId, label: b.label, limit: b.monthlyLimit, spent, pct, projection, expectedPace: day / dim, status, over };
}

export function ceilings(budgets: Budget[], transactions: Transaction[], today: Date): CeilingView[] {
  const spent = spentByCategory(transactions, today);
  return budgets.map((b) => ceilingView(b, spent[b.categoryId] || 0, today));
}

/** Tetos em risco para o Início: no limite ou acima do ritmo, maior % primeiro, até 3. */
export function ceilingsAtRisk(list: CeilingView[], max = 3): CeilingView[] {
  return list.filter((c) => c.status !== "ritmo").sort((a, b) => b.pct - a.pct).slice(0, max);
}

export const totalSpent = (transactions: Transaction[], today: Date) => sum(Object.values(spentByCategory(transactions, today)));
