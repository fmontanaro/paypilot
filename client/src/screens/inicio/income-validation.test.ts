import { describe, expect, it } from "vitest";
import { parseIncomeAmount, validateIncomeDraft } from "./income-validation";

describe("parseIncomeAmount", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["1.23", 1.23],
    ["4,56", 4.56],
    ["19,99", 19.99],
    ["R$ 1.234,56", 1234.56],
    ["1 23", null],
    ["5e2", null],
    ["1,234", null],
    ["1.234.56", null],
    ["0,001", null],
    ["10.000.000,01", null],
  ])("valida %s sem alterar silenciosamente o valor", (value, expected) => {
    expect(parseIncomeAmount(value).amount).toBe(expected);
  });
});

describe("validateIncomeDraft", () => {
  it("aceita dia 31 e nome com espaços externos", () => {
    expect(validateIncomeDraft({ name: "  Salário  ", amount: "3.500,00", payDay: "31", recurring: true }).values).toEqual({
      name: "Salário",
      amount: 3500,
      payDay: 31,
      recurring: true,
    });
  });
});
