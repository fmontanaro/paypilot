// Catálogo de categorias. A cor de cada uma é oklch(0.6 0.13 <hue>) com fundo a 16%.

export interface Category {
  id: string;
  name: string;
  icon: string;
  hue: number;
  fixed: boolean;
  essential: boolean;
}

export const CATEGORIES: Category[] = [
  { id: "moradia", name: "Moradia", icon: "home", hue: 250, fixed: true, essential: true },
  { id: "juros", name: "Juros e tarifas", icon: "percent", hue: 210, fixed: true, essential: false },
  { id: "mercado", name: "Mercado", icon: "shopping_cart", hue: 145, fixed: false, essential: true },
  { id: "restaurantes", name: "Restaurantes", icon: "restaurant", hue: 30, fixed: false, essential: false },
  { id: "empresa", name: "Minha empresa", icon: "business_center", hue: 285, fixed: true, essential: true },
  { id: "transporte", name: "Transporte e Uber", icon: "local_taxi", hue: 70, fixed: false, essential: true },
  { id: "compras", name: "Compras", icon: "shopping_bag", hue: 345, fixed: false, essential: false },
  { id: "assinaturas", name: "Assinaturas", icon: "subscriptions", hue: 315, fixed: true, essential: false },
  { id: "saude", name: "Saúde e farmácia", icon: "medical_services", hue: 185, fixed: false, essential: true },
  { id: "educacao", name: "Educação", icon: "school", hue: 120, fixed: true, essential: true },
  { id: "lazer", name: "Lazer e passeios", icon: "attractions", hue: 10, fixed: false, essential: false },
  { id: "transferencia", name: "Transferência", icon: "sync_alt", hue: 110, fixed: false, essential: true },
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function category(id: string | null | undefined): Category {
  return CATEGORY_BY_ID[id || ""] || CATEGORY_BY_ID.compras;
}

export const catColor = (hue: number) => `oklch(0.6 0.13 ${hue})`;
export const catSoft = (hue: number) => `oklch(0.6 0.13 ${hue} / 0.16)`;

/** Categorias que entram na escolha rápida (detalhe da transação). */
export const PICKABLE = ["moradia", "mercado", "restaurantes", "transporte", "assinaturas", "compras", "saude", "lazer", "empresa", "transferencia"];
