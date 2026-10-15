import { describe, expect, it } from "vitest";
import type { User } from "@shared/schema";
import { DEFAULT_PREFS } from "@shared/schema";
import { publicUser } from "./storage";

describe("compatibilidade de contas antigas", () => {
  it("normaliza nome vazio e não expõe o hash da senha", () => {
    const legacy: User = {
      id: "legacy-test",
      email: null,
      phone: null,
      name: null,
      passwordHash: null,
      plan: "gratis",
      prefs: DEFAULT_PREFS,
      isDemo: false,
      onboardedAt: null,
      createdAt: new Date("2026-01-01"),
    };
    expect(publicUser(legacy).name).toBe("");
    expect(publicUser(legacy)).not.toHaveProperty("passwordHash");
  });
});
