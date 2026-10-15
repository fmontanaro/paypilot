export type IncomeDraft = {
  name: string;
  amount: string;
  payDay: string;
  recurring: boolean;
};

export type IncomeValues = {
  name: string;
  amount: number;
  payDay: number;
  recurring: boolean;
};

export function parseIncomeAmount(value: string): { amount: number | null; error: string | null } {
  const raw = value.trim().replace(/^R\$\s*/i, "");
  if (!raw) return { amount: null, error: "Informe o valor mensal previsto." };
  if (!/^\d/.test(raw) || /[+\-eE]/.test(raw)) return { amount: null, error: "Use um valor em reais, sem sinais ou notação científica." };

  let normalized: string;
  if (raw.includes(",")) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) {
      return { amount: null, error: "Confira os centavos. Use, por exemplo, 1.234,56." };
    }
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(".")) {
    const decimal = /^\d+\.\d{1,2}$/.test(raw);
    const grouped = /^\d{1,3}(?:\.\d{3})+$/.test(raw);
    if (!decimal && !grouped) return { amount: null, error: "Confira os centavos. Use até duas casas decimais." };
    normalized = decimal ? raw : raw.replace(/\./g, "");
  } else {
    if (!/^\d+$/.test(raw)) return { amount: null, error: "Informe um valor válido." };
    normalized = raw;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 10_000_000) {
    return { amount: null, error: "O valor deve ficar entre R$ 0,01 e R$ 10.000.000,00." };
  }
  if (Math.abs(Math.round(amount * 100) - amount * 100) >= 0.000001) {
    return { amount: null, error: "O valor pode ter no máximo duas casas decimais." };
  }
  return { amount: Math.round(amount * 100) / 100, error: null };
}

export function validateIncomeDraft(draft: IncomeDraft): { values: IncomeValues | null; errors: Partial<Record<keyof IncomeDraft, string>> } {
  const errors: Partial<Record<keyof IncomeDraft, string>> = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Informe o nome da renda.";
  else if (name.length > 80) errors.name = "Use até 80 caracteres.";

  const parsedAmount = parseIncomeAmount(draft.amount);
  if (parsedAmount.error) errors.amount = parsedAmount.error;

  const dayText = draft.payDay.trim();
  const payDay = /^\d+$/.test(dayText) ? Number(dayText) : NaN;
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) errors.payDay = "Informe um dia inteiro entre 1 e 31.";

  if (Object.keys(errors).length) return { values: null, errors };
  return {
    values: { name, amount: parsedAmount.amount!, payDay, recurring: draft.recurring },
    errors,
  };
}
