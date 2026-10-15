import { describe, expect, it } from "vitest";
import { createGoalEditDraft, validateGoalEdit, type GoalEditDraft } from "./editDraft";

const goal = { name: "Viagem", icon: "flight", target: 2400, months: 6, startMonth: "2026-01" } as const;
const validDraft: GoalEditDraft = { name: "Viagem", icon: "flight", target: "2.400,00", deadline: "2026-06" };

describe("rascunho de edição de meta", () => {
  it("omite prazo original vencido e valida somente um prazo alterado", () => {
    const unchanged = validateGoalEdit(validDraft, "2026-01", "2026-07", "2026-06");
    expect(unchanged.errors).toEqual({});
    expect(unchanged.payload).not.toHaveProperty("deadline");
    const changed = validateGoalEdit({ ...validDraft, deadline: "2026-05" }, "2026-01", "2026-07", "2026-06");
    expect(changed.payload).toBeNull();
    expect(changed.errors.deadline).toBeTruthy();
    expect(validateGoalEdit({ ...validDraft, deadline: "2026-07" }, "2026-01", "2026-07", "2026-06").payload?.deadline).toBe("2026-07");
  });
  it("reabre com os dados atuais e calcula o prazo incluindo o mês inicial", () => {
    expect(createGoalEditDraft(goal)).toEqual(validDraft);
  });

  it("valida e envia somente os campos editáveis, sem início ou histórico", () => {
    expect(validateGoalEdit({ ...validDraft, name: "  Viagem nova  " }, "2026-01", "2026-03").payload).toEqual({
      name: "Viagem nova", icon: "flight", target: 2400, deadline: "2026-06",
    });
  });

  it("aceita alvo abaixo do que já foi guardado (a regra de edição não depende do histórico)", () => {
    expect(validateGoalEdit({ ...validDraft, target: "10,00" }, "2026-01", "2026-03").payload?.target).toBe(10);
  });

  it.each([
    [{ ...validDraft, name: " " }, "name"],
    [{ ...validDraft, name: "x".repeat(61) }, "name"],
    [{ ...validDraft, target: "0,00" }, "target"],
    [{ ...validDraft, target: "1,999" }, "target"],
    [{ ...validDraft, deadline: "2026-02" }, "deadline"],
    [{ ...validDraft, deadline: "2036-01" }, "deadline"],
  ] as const)("rejeita valores inválidos sem produzir payload", (draft, field) => {
    const result = validateGoalEdit(draft, "2026-01", "2026-03");
    expect(result.payload).toBeNull();
    expect(result.errors[field]).toBeTruthy();
  });

  it("recria o rascunho em vez de reaproveitar alterações anteriores", () => {
    const firstOpen = createGoalEditDraft(goal);
    firstOpen.name = "Rascunho descartado";
    expect(createGoalEditDraft(goal).name).toBe("Viagem");
  });
});
