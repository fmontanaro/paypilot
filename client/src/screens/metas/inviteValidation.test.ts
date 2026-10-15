import { describe, expect, it } from "vitest";
import { isGoalInviteToken, isInviteContact } from "./inviteValidation";

describe("validação de convite de meta", () => {
  it("aceita somente código hexadecimal de 64 caracteres", () => {
    expect(isGoalInviteToken("a".repeat(64))).toBe(true);
    expect(isGoalInviteToken("A1".repeat(32))).toBe(true);
    expect(isGoalInviteToken("a".repeat(63))).toBe(false);
    expect(isGoalInviteToken("g".repeat(64))).toBe(false);
    expect(isGoalInviteToken(`${"a".repeat(64)}0`)).toBe(false);
  });

  it("aceita e-mail ou telefone com quantidade plausível de dígitos", () => {
    expect(isInviteContact("pessoa@exemplo.com")).toBe(true);
    expect(isInviteContact("+55 (11) 98765-4321")).toBe(true);
    expect(isInviteContact("123")).toBe(false);
    expect(isInviteContact("123456789")).toBe(false);
    expect(isInviteContact("12345678901234")).toBe(false);
    expect(isInviteContact("nao é contato")).toBe(false);
  });
});
