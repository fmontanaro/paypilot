import { describe, expect, it } from "vitest";
import { amountFromText, ruleIntent, whatFromText } from "./intents";

describe("interpretador por regras", () => {
  it("entende registro de gasto com valor e o que foi comprado", () => {
    expect(ruleIntent("Comprei um suco de R$ 12,90")).toMatchObject({ intent: "registrar_gasto", amount: 12.9, description: "Suco", category: "restaurantes" });
    expect(ruleIntent("gastei 48 reais no almoço no Coco Bambu")).toMatchObject({ intent: "registrar_gasto", amount: 48, description: "Almoço · Coco Bambu" });
  });
  it("entende teto, posso gastar e vencimentos", () => {
    expect(ruleIntent("Quanto falta no meu teto de Uber?")).toMatchObject({ intent: "consultar_teto", category: "transporte" });
    expect(ruleIntent("Posso gastar R$ 600 num jantar sábado?")).toMatchObject({ intent: "posso_gastar", amount: 600, category: "restaurantes" });
    expect(ruleIntent("O que vence esta semana?").intent).toBe("vencimentos");
  });
  it("recusa investimento e assunto fora das finanças", () => {
    expect(ruleIntent("Onde devo investir minha sobra?").intent).toBe("investimento");
    expect(ruleIntent("Qual a capital da França?").intent).toBe("fora_do_escopo");
  });
  it("lê valores em reais", () => {
    expect(amountFromText("paguei R$ 1.234,56 de luz")).toBe(1234.56);
    expect(whatFromText("comprei pão")).toBe("Pão");
  });
});
