// Instituições com cor e iniciais (placeholder até os logos oficiais licenciados).
export interface Bank {
  id: string;
  name: string;
  m: string;
  c: string;
  tc: string;
}

export const BANKS: Bank[] = [
  { id: "nubank", name: "Nubank", m: "Nu", c: "#820AD1", tc: "#fff" },
  { id: "itau", name: "Itaú", m: "It", c: "#EC7000", tc: "#fff" },
  { id: "santander", name: "Santander", m: "S", c: "#EC0000", tc: "#fff" },
  { id: "xp", name: "XP", m: "XP", c: "#111111", tc: "#fff" },
  { id: "bradesco", name: "Bradesco", m: "B", c: "#CC092F", tc: "#fff" },
  { id: "bb", name: "Banco do Brasil", m: "BB", c: "#FCE500", tc: "#1A3A8A" },
  { id: "caixa", name: "Caixa", m: "CX", c: "#005CA9", tc: "#fff" },
  { id: "inter", name: "Inter", m: "In", c: "#FF7A00", tc: "#fff" },
  { id: "c6", name: "C6 Bank", m: "C6", c: "#2B2B2B", tc: "#fff" },
];

export function bankOf(institution: string | null | undefined): Bank {
  const b = BANKS.find((x) => x.name === institution);
  if (b) return b;
  const name = institution || "Conta";
  return { id: "outro", name, m: name.replace(/^Cartão da /, "").slice(0, 1).toUpperCase(), c: "var(--accent)", tc: "#fff" };
}
