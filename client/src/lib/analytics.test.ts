import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

afterEach(() => vi.unstubAllGlobals());

describe("rastreador seguro", () => {
  it("não exige um navegador", () => {
    vi.stubGlobal("window", undefined);
    expect(() => trackEvent("goal_edit_opened")).not.toThrow();
  });

  it("não exige o rastreador", () => {
    vi.stubGlobal("window", {});
    expect(() => trackEvent("goal_edit_opened")).not.toThrow();
  });

  it("encaminha o evento e suas dimensões", () => {
    const track = vi.fn();
    vi.stubGlobal("window", { umami: { track } });
    trackEvent("goal_edit_failed", { reason: "validation" });
    expect(track).toHaveBeenCalledExactlyOnceWith("goal_edit_failed", { reason: "validation" });
  });

  it("isola exceções síncronas do rastreador", () => {
    vi.stubGlobal("window", { umami: { track: () => { throw new Error("indisponível"); } } });
    expect(() => trackEvent("goal_edit_saved")).not.toThrow();
  });

  it("absorve rejeições assíncronas sem aguardar o rastreador", async () => {
    const track = vi.fn(() => Promise.reject(new Error("indisponível")));
    vi.stubGlobal("window", { umami: { track } });
    expect(trackEvent("goal_edit_saved")).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(track).toHaveBeenCalledOnce();
  });
});
