import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, type User } from "@shared/schema";
import { hasFeature } from "@shared/plans";
import { applyComplimentaryPlan } from "./entitlements";

const user: User = {
  id: "selected-account",
  email: null,
  phone: null,
  name: "Teste",
  passwordHash: null,
  plan: "gratis",
  prefs: DEFAULT_PREFS,
  isDemo: false,
  onboardedAt: null,
  createdAt: new Date("2026-01-01"),
};

describe("acesso de cortesia", () => {
  it("libera Pilot somente para o ID configurado, sem alterar o objeto original", () => {
    const granted = applyComplimentaryPlan(user, "another-account, selected-account");
    expect(granted.plan).toBe("pilot");
    expect(hasFeature(granted.plan as "pilot", "quitacao")).toBe(true);
    expect(user.plan).toBe("gratis");
  });

  it("não altera outras contas", () => {
    expect(applyComplimentaryPlan(user, "another-account")).toBe(user);
  });

  it("não aceita IDs parcialmente coincidentes", () => {
    expect(applyComplimentaryPlan(user, "selected-account-extra")).toBe(user);
  });

  it("não concede acesso sem configuração", () => {
    expect(applyComplimentaryPlan(user, "")).toBe(user);
  });

  it("mantém o plano salvo quando a cortesia é removida", () => {
    const paid = { ...user, plan: "plus" };
    expect(applyComplimentaryPlan(paid, "")).toBe(paid);
  });
});
