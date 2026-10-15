// Interpretador por regras, em português. Funciona sem IA e é a primeira tentativa sempre.
import { normalize } from "@shared/engine";
import { parseMoney } from "@shared/format";

export type IntentName = "registrar_gasto" | "consultar_teto" | "posso_gastar" | "vencimentos" | "resumo_mes" | "plano" | "investimento" | "saudacao" | "fora_do_escopo";

export interface Intent {
  intent: IntentName;
  amount?: number | null;
  description?: string | null;
  category?: string | null;
}

const CAT_WORDS: [RegExp, string][] = [
  [/mercado|supermercado|feira|hortifruti|padaria/, "mercado"],
  [/uber|99|taxi|gasolina|posto|combustivel|onibus|metro|estacionamento|transporte/, "transporte"],
  [/farmacia|remedio|consulta|exame|medico|dentista|saude/, "saude"],
  [/almoco|jantar|lanche|suco|cafe|restaurante|ifood|pizza|bar|cerveja|sushi/, "restaurantes"],
  [/cinema|show|passeio|viagem|ingresso|lazer/, "lazer"],
  [/roupa|sapato|loja|presente|compra|amazon|eletronico/, "compras"],
  [/aluguel|condominio|luz|agua|gas|internet/, "moradia"],
];

export function categoryFromText(s: string): string | null {
  const t = normalize(s);
  for (const [re, c] of CAT_WORDS) if (re.test(t)) return c;
  return null;
}

/** Primeiro valor em reais da frase ("R$ 12,90", "48 reais", "600"). */
export function amountFromText(s: string): number | null {
  const m = s.match(/r\$\s*([\d.]+(?:,\d{1,2})?)|([\d.]+(?:,\d{1,2})?)\s*(?:reais|real|conto|pila)|(\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const v = parseMoney(m[1] || m[2] || m[3]);
  return v > 0 ? v : null;
}

/** O que foi comprado: "comprei um suco de R$ 12,90" → "Suco"; "gastei 48 no almoço no Coco Bambu" → "Almoço · Coco Bambu". */
export function whatFromText(s: string): string | null {
  const t = s.replace(/r\$\s*[\d.,]+|[\d.,]+\s*(reais|real)?/gi, " ").replace(/\s+/g, " ").trim();
  let m = t.match(/(?:comprei|paguei|gastei)\s+(?:(?:um|uma|o|a|uns|umas|no|na|em|com)\s+)*([a-zà-ú][a-zà-ú ]*?)(?:\s+(?:de|por|no|na|em|com)\b|$)/i);
  const place = t.match(/\b(?:no|na|em)\s+(?:o|a)?\s*([A-ZÀ-Ú][\wÀ-ú ]+)$/);
  let what = m?.[1]?.trim() || null;
  if (!what) {
    m = t.match(/\b(?:no|na|em|com)\s+(?:o|a)?\s*(almoço|almoco|jantar|lanche|mercado|uber|farmácia|farmacia|cinema)/i);
    what = m?.[1] || null;
  }
  if (what && /^(reais|real|r)$/i.test(what)) what = null;
  if (!what && !place) return null;
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  if (what && place && !normalize(place[1]).includes(normalize(what))) return `${cap(what)} · ${place[1].trim()}`;
  return cap((what || place![1]).trim());
}

export function ruleIntent(text: string): Intent {
  const s = normalize(text);
  const amount = amountFromText(text);
  if (/\b(invest\w*|aplicar|aplicacao|acoes|cripto\w*|bitcoin|tesouro direto|cdb|fundos? imobiliarios?|renda fixa)\b/.test(s)) return { intent: "investimento" };
  if (/\bteto\b|quanto (falta|sobra|resta) (no|na|em|de)/.test(s)) return { intent: "consultar_teto", category: categoryFromText(text) };
  if (/posso gastar|da pra gastar|consigo gastar|cabe (um|uma|gastar)/.test(s)) return { intent: "posso_gastar", amount, category: categoryFromText(text) || "lazer", description: whatFromText(text) };
  if (/venc|o que vence|contas da semana|a pagar esta semana/.test(s)) return { intent: "vencimentos" };
  if (/\b(comprei|gastei|paguei)\b/.test(s) && amount) return { intent: "registrar_gasto", amount, category: categoryFromText(text), description: whatFromText(text) };
  if (/plano|quitar|quitacao|divida|fase/.test(s)) return { intent: "plano" };
  if (/quanto (gastei|ja gastei)|resumo|como (estou|esta) o mes|fatura|gasto|conta|cartao|mes/.test(s)) return { intent: "resumo_mes" };
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(s)) return { intent: "saudacao" };
  return { intent: "fora_do_escopo" };
}
