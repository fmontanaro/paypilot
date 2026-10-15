/** Não remove separadores ou caracteres inválidos: isso poderia mudar o valor. */
export function formatDraft(value: string) {
  return value.replace(/^\s*R\$\s*/i, "");
}

export function validateAmount(draft: string): { amount: number | null; error: string | null } {
  const value = formatDraft(draft).trim();
  if (!value) return { amount: null, error: "Informe o valor adicional que você guardou." };
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d*)?$/.test(value)) {
    return { amount: null, error: "Use o formato brasileiro, como 1.234,56." };
  }
  const decimals = value.includes(",") ? value.split(",")[1] : "";
  if (value.includes(",") && (!decimals || decimals.length > 2)) {
    return { amount: null, error: "Use no máximo duas casas decimais." };
  }
  const amount = Number(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount)) return { amount: null, error: "Informe um valor válido." };
  if (amount < 0.01) return { amount: null, error: "Informe um valor de pelo menos R$ 0,01." };
  if (amount > 10_000_000) return { amount: null, error: "O valor máximo por registro é R$ 10.000.000,00." };
  return { amount, error: null };
}
