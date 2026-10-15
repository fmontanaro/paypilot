// Simulador de renegociação: faixa de proposta à vista, parcela e prazo antes × depois.
// Não indica banco nem vende crédito: o usuário leva a proposta à instituição da dívida.
import { brl, pct } from "../format";
import { pmt } from "./finance";
import type { Debt } from "./payoff";

export const RENEG_RULES: Record<Exclude<Debt["kind"], "pessoal">, { range: [number, number]; refRate: number }> = {
  rotativo: { range: [0.6, 0.7], refRate: 2.9 },
  cheque: { range: [0.85, 0.94], refRate: 2.5 },
  emprestimo: { range: [0.875, 0.93], refRate: 2.4 },
};

export interface RenegResult {
  range: [number, number];
  refRate: number;
  months: number;
  newInstallment: number;
  newTotal: number;
  before: { installment: string; term: string; total: string };
  script: string;
}

const round50 = (v: number) => Math.round(v / 50) * 50;

export function renegotiate(d: Debt, months: number, installmentsLeft?: number | null): RenegResult | null {
  if (d.kind === "pessoal") return null;
  const rule = RENEG_RULES[d.kind];
  const range: [number, number] = [round50(d.balance * rule.range[0]), round50(d.balance * rule.range[1])];
  const P = pmt(d.balance, rule.refRate, months);
  let before: RenegResult["before"];
  if (d.kind === "rotativo") before = { installment: `${brl(d.minPayment)} (mínimo)`, term: "Sem fim definido", total: `Cresce ${pct(d.rate)} ao mês` };
  else if (d.kind === "cheque") before = { installment: `${brl((d.balance * d.rate) / 100)} só de juros`, term: "Sem fim definido", total: `Cresce ${pct(d.rate)} ao mês` };
  else {
    const n = installmentsLeft ?? Math.ceil(d.balance / d.minPayment);
    before = { installment: brl(d.minPayment), term: `${n} meses`, total: brl(d.minPayment * n) };
  }
  const script = `“Olá, tenho uma dívida de ${brl(d.balance)} (${d.name}). Quero encerrar: posso pagar ${brl(range[0])} à vista, ou ${months} parcelas de ${brl(P)}. Vocês conseguem formalizar esse acordo?”`;
  return { range, refRate: rule.refRate, months, newInstallment: P, newTotal: P * months, before, script };
}
