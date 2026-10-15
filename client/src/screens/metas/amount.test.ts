import { describe, expect, it } from "vitest";
import { formatDraft, validateAmount } from "./amount";

describe("valor adicional guardado em formato brasileiro", () => {
  it.each([
    ["500", 500], ["500,00", 500], ["1.234,56", 1234.56],
    ["0,01", 0.01], ["R$ 500,50", 500.5], ["10.000.000,00", 10_000_000],
  ])("interpreta %s sem alterar o valor", (draft, amount) => {
    expect(validateAmount(draft as string)).toEqual({ amount, error: null });
  });

  it.each(["", "0", "-10", "1,234", "5e2", "abc500", "1,2,3", "1.23", "10.000.000,01", "Infinity", "0,001"])(
    "rejeita %s sem converter para outro número",
    (draft) => {
      expect(validateAmount(draft).amount).toBe(null);
      expect(validateAmount(draft).error).toBeTruthy();
    },
  );

  it("preserva os caracteres inválidos para que a validação possa recusá-los", () => {
    expect(formatDraft("R$ 1,2,3")).toBe("1,2,3");
    expect(formatDraft("5e2")).toBe("5e2");
  });
});
