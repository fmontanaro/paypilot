// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Metas from "../Metas";

const state = vi.hoisted(() => ({ plan: "gratis", sub: "lista", ctx: null as any, go: vi.fn() }));
vi.mock("@/lib/app", () => ({ useApp: () => ({ plan: state.plan, sub: state.sub, bp: "desktop", go: state.go, toast: vi.fn() }) }));
vi.mock("@/lib/api", async (original) => ({
  ...await original<typeof import("@/lib/api")>(), useCtx: () => ({ ctx: state.ctx }),
}));
let root: Root, container: HTMLDivElement, client: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;
const goal = (id: string, userId = "owner", isGroup = false) => ({
  id, userId, isGroup, name: `Meta ${id}`, icon: "savings", target: 2000, saved: 10,
  months: 12, startMonth: "2026-10", sources: [], splitMode: "igual", myPrivacy: "contrib", historyStartedAt: null,
});
const render = () => act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Metas))));
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
const change = (field: HTMLInputElement, value: string) => act(async () => { field.value = value; Simulate.change(field); });
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  state.plan = "gratis";
  state.sub = "lista";
  state.ctx = { today: new Date(2026, 9, 15), month: "2026-10", data: { goals: [], goalMembers: [], user: { id: "owner" } } };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});

describe("convites na tela de metas", () => {
  it("permite aceitar no plano grátis, informa o compartilhamento e mostra erro e nova tentativa", async () => {
    const field = container.querySelector<HTMLInputElement>("#goal-invite-code")!;
    expect(field).not.toBeNull();
    expect(container.textContent).toContain("você compartilha seu nome");
    const form = field.closest("form")!;
    const button = form.querySelector("button")!;
    expect(button.disabled).toBe(true);
    await change(field, "a".repeat(64));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Convite expirado" }), { status: 404 }));
    await act(async () => Simulate.submit(form));
    await settle();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Convite expirado");
    await change(field, "b".repeat(64));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ goalId: "accepted" }), { status: 200 }));
    await act(async () => Simulate.submit(form));
    await settle();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/goal-invites/accept");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ token: "b".repeat(64) });
    expect(container.textContent).toContain("Convite aceito");
    expect(field.value).toBe("");
  });

  it("permite ao proprietário Pilot gerar e copiar manualmente o convite de uma meta pessoal", async () => {
    state.plan = "pilot";
    state.ctx.data.goals = [goal("personal")];
    await render();
    const field = container.querySelector<HTMLInputElement>("#invite-personal");
    expect(field).toBeTruthy();
    await change(field!, "guest@example.test");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      id: "invite", contact: "guest@example.test", token: "c".repeat(64), expiresAt: "2026-10-22T12:00:00Z",
    }), { status: 201 }));
    await act(async () => field!.closest("section")!.querySelector<HTMLButtonElement>("button")!.click());
    await settle();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/goals/personal/invites");
    expect(container.querySelector<HTMLInputElement>("#token-personal")?.value).toBe("c".repeat(64));
    expect(container.textContent).toContain("manualmente");
  });

  it("convidado vê sua participação sem controles de administração e pode selecionar outra meta", async () => {
    state.ctx.data.user.id = "guest";
    state.sub = "grupo";
    state.ctx.data.goals = [goal("first", "owner", true), goal("second", "owner", true)];
    state.ctx.data.goalMembers = ["first", "second"].map((id) => ({
      id: `member-${id}`, goalId: id, isMe: true, name: "Convidada", saved: 10, income: null, privacy: "contrib",
    }));
    await render();
    expect(container.textContent).toContain("Convidada (você)");
    expect(container.textContent).not.toContain("Convidar participante");
    expect(container.textContent).not.toContain("Editar meta");
    const select = container.querySelector("select")!;
    expect([...select.options].map((o) => o.value)).toEqual(["first", "second"]);
    await act(async () => { select.value = "second"; Simulate.change(select); });
    expect(container.textContent).toContain("Meta second");
    expect(container.querySelector('[aria-label="Registrar valor guardado para Meta second"]')).not.toBeNull();
  });
});
