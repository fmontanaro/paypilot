// Planos de assinatura e o que cada um libera (tabela de funcionalidades de docs/produto.md).

export type PlanId = "gratis" | "plus" | "pilot";

export const PLAN_NAMES: Record<PlanId, string> = { gratis: "Grátis", plus: "Plus", pilot: "Pilot" };
export const PLAN_RANK: Record<PlanId, number> = { gratis: 0, plus: 1, pilot: 2 };

export type Feature =
  | "multi_open_finance"
  | "contas_manuais"
  | "dividas_pessoais"
  | "tetos"
  | "vazamentos_completo"
  | "checkin"
  | "metas"
  | "whatsapp"
  | "prioridades"
  | "quitacao"
  | "credito"
  | "rolagem"
  | "renegociacao"
  | "grupos"
  | "metas_grupo";

export const FEATURE_PLAN: Record<Feature, PlanId> = {
  multi_open_finance: "plus",
  contas_manuais: "plus",
  dividas_pessoais: "plus",
  tetos: "plus",
  vazamentos_completo: "plus",
  checkin: "plus",
  metas: "plus",
  whatsapp: "plus",
  prioridades: "pilot",
  quitacao: "pilot",
  credito: "pilot",
  rolagem: "pilot",
  renegociacao: "pilot",
  grupos: "pilot",
  metas_grupo: "pilot",
};

export function hasFeature(plan: PlanId, f: Feature): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_PLAN[f]];
}

/** Mensagens do assistente por mês no plano Grátis. */
export const FREE_CHAT_LIMIT = 30;

export const PLAN_CARDS: { id: PlanId; who: string; price: string; per: string; feats: string[] }[] = [
  {
    id: "gratis",
    who: "Para ver para onde o dinheiro vai",
    price: "R$ 0",
    per: "",
    feats: ["1 conta via Open Finance ou importação de arquivos sem limite", "Dashboard e categorização automática", "Resumo do caçador de vazamentos", "Assistente no app com limite de mensagens"],
  },
  {
    id: "plus",
    who: "Para controlar o mês",
    price: "R$ XX",
    per: "/mês",
    feats: ["Várias contas e cartões", "Contas manuais e dívidas pessoais", "Tetos com alertas", "Caçador de vazamentos completo", "Metas e relatórios", "Assistente no WhatsApp"],
  },
  {
    id: "pilot",
    who: "Para sair das dívidas",
    price: "R$ XX",
    per: "/mês",
    feats: ["Tudo do Plus", "Prioridades do mês", "Plano de quitação", "Otimizador de rolagem", "Simulador de renegociação", "Grupos de despesa e metas em grupo"],
  },
];

export const PAYWALL_FEATS: Record<"plus" | "pilot", string[]> = {
  plus: ["Várias contas e cartões", "Tetos com alertas e caçador de vazamentos completo", "Metas, relatórios e assistente no WhatsApp"],
  pilot: ["Prioridades do mês com custo de cada escolha", "Plano de quitação e otimizador de rolagem", "Renegociação, grupos de despesa e metas em grupo"],
};
