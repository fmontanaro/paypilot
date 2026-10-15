// Categorização automática: regras do usuário primeiro, depois o dicionário padrão.
import type { CategoryRule } from "../schema";

/** Dicionário padrão: categoria → palavras-chave (sem acento, minúsculas). */
const DICTIONARY: [string, RegExp][] = [
  ["juros", /\b(juros|iof|tarifa|cesta de servi|pacote de servi|anuidade|encargos|multa|rotativo)\b/],
  ["empresa", /\b(darf|simples nacional|das mei|contabil|cnpj|alvara|certificado digital)\b/],
  ["assinaturas", /\b(spotify|deezer|netflix|disney|globoplay|hbo max|prime video|amazon prime|youtube premium|apple\.com|icloud|google one|uber one|smart ?fit|gympass|wellhub|clube de vinhos?|paramount|crunchyroll|tidal)\b/],
  ["transporte", /\b(uber|99 ?app|99 ?pop|cabify|posto|shell|ipiranga|petrobras|br mania|estapar|sem parar|conectcar|metro|bilhete unico|combustivel)\b/],
  ["restaurantes", /\b(ifood|rappi|restaurante|lanchonete|padaria|pizzaria|burger|mc ?donald|outback|coco bambu|starbucks|cafe|bar |suco|sushi|churrascaria)\b/],
  ["mercado", /\b(mercado|supermercado|pao de acucar|carrefour|assai|atacadao|hortifruti|sams club|st marche|zaffari)\b/],
  ["saude", /\b(drogasil|droga raia|drogaria|farmacia|pague menos|hospital|clinica|laboratorio|fleury|unimed|amil|bradesco saude|sulamerica)\b/],
  ["moradia", /\b(aluguel|condominio|iptu|enel|light|sabesp|comgas|cemig|copel|energia|agua e esgoto|gas natural|vivo fibra|claro net|internet)\b/],
  ["educacao", /\b(escola|colegio|faculdade|universidade|curso|mensalidade escolar)\b/],
  ["lazer", /\b(cinema|ingresso|teatro|show|parque|viagem|hotel|airbnb|booking|decolar|steam|playstation)\b/],
  ["transferencia", /\b(pix para|ted para|transferencia|doc para|pix enviado)\b/],
];

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface CategorizeResult {
  categoryId: string;
  groupId: string | null;
  ruleId: string | null;
}

export function categorize(description: string, rules: CategoryRule[] = []): CategorizeResult {
  const d = normalize(description);
  const sorted = [...rules].filter((r) => r.enabled).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  let categoryId: string | null = null;
  let groupId: string | null = null;
  let ruleId: string | null = null;
  for (const r of sorted) {
    if (!d.includes(normalize(r.pattern))) continue;
    if (r.categoryId && !categoryId) {
      categoryId = r.categoryId;
      ruleId = r.id;
    }
    if (r.groupId && !groupId) groupId = r.groupId;
  }
  if (!categoryId) {
    for (const [cat, re] of DICTIONARY) {
      if (re.test(d)) {
        categoryId = cat;
        break;
      }
    }
  }
  return { categoryId: categoryId || "compras", groupId, ruleId };
}

/** Padrão sugerido para "Criar regra para casos parecidos": a descrição sem números e códigos. */
export function rulePattern(description: string): string {
  return description
    .replace(/\*.*$/, "")
    .replace(/[\d#/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
