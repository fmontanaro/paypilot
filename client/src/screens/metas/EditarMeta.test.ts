// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal } from "@shared/schema";
import { EditarMeta } from "./EditarMeta";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/lib/app", () => ({ useApp: () => ({ toast, bp: "desktop" }) }));

const goal: Goal = {
  id: "edit-ui", userId: "owner", name: "Viagem", icon: "flight", target: 2400.29,
  saved: 400.29, months: 6, startMonth: "2026-01", isGroup: false,
  splitMode: "prop", myPrivacy: "contrib", sources: ["sub"], createdAt: new Date(2026, 0, 1), historyStartedAt: null,
};
let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;
let track: ReturnType<typeof vi.fn<NonNullable<Window["umami"]>["track"]>>;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  toast.mockReset();
  track = vi.fn();
  window.umami = { track };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root.render(createElement(QueryClientProvider, { client },
      createElement(EditarMeta, { goal, saved: goal.saved, members: [], today: new Date(2026, 2, 15), currentMonth: "2026-03", availableIcons: ["flight"] }),
    ));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  delete window.umami;
  vi.unstubAllGlobals();
});

const field = (key: string) => container.querySelector<HTMLInputElement>(`#goal-edit-edit-ui-${key}`)!;
const button = (text: string) => [...container.querySelectorAll("button")].find((el) => el.textContent?.trim().endsWith(text))!;
async function click(text: string) { await act(async () => button(text).click()); }
async function change(key: string, value: string) {
  await act(async () => {
    field(key).value = value;
    Simulate.change(field(key));
  });
}
async function submit() {
  await act(async () => Simulate.submit(container.querySelector("form")!));
}
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });

describe("formulário de edição da meta", () => {
  it("abre preenchido, cancela sem chamar a API e descarta o rascunho ao reabrir", async () => {
    expect(track).not.toHaveBeenCalled();
    await click("Editar meta");
    expect(field("name").value).toBe("Viagem");
    expect(field("target").value).toBe("2.400,29");
    expect(field("deadline").value).toBe("2026-06");
    await change("name", "Não salvar");
    await change("target", "123,45");
    await change("deadline", "2026-12");
    await click("Cancelar");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Editar meta");
    expect(field("name").value).toBe(goal.name);
    expect(field("target").value).toBe("2.400,29");
    expect(field("deadline").value).toBe("2026-06");
    expect(track.mock.calls).toEqual([
      ["goal_edit_opened", undefined],
      ["goal_edit_cancelled", undefined],
      ["goal_edit_opened", undefined],
    ]);
  });

  it("impede envio inválido e mostra o erro sem chamar a API", async () => {
    await click("Editar meta");
    await change("name", " ");
    await change("target", "-1");
    await change("deadline", "2026-02");
    await submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Informe o nome da meta.");
    expect(field("target").getAttribute("aria-invalid")).toBe("true");
    expect(field("deadline").getAttribute("aria-invalid")).toBe("true");
    expect(track.mock.calls).toEqual([
      ["goal_edit_opened", undefined],
      ["goal_edit_failed", { reason: "validation" }],
    ]);
  });

  it("envia apenas os detalhes, impede duplicação, atualiza o snapshot e fecha após salvar", async () => {
    let resolveRequest!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await click("Editar meta");
    await change("name", "  Computador  ");
    await change("target", "0,29");
    await change("deadline", "2026-12");
    await submit();
    await settle();
    expect(button("Salvando…").disabled).toBe(true);
    await submit();
    await click("Cancelar");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(track.mock.calls).toEqual([["goal_edit_opened", undefined]]);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/goals/edit-ui");
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(request.body)).toEqual({ name: "Computador", icon: "flight", target: 0.29, deadline: "2026-12" });
    await act(async () => { resolveRequest(new Response(JSON.stringify({ ...goal, name: "Computador" }), { status: 200 })); });
    await settle();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["snapshot"] });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(toast).toHaveBeenCalledWith("Meta “Computador” atualizada");
    expect(track.mock.calls).toEqual([
      ["goal_edit_opened", undefined],
      ["goal_edit_saved", undefined],
    ]);
  });

  it("mantém as alterações e permite tentar novamente após erro do servidor", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Não foi possível salvar agora." }), { status: 500 }));
    await click("Editar meta");
    await change("name", "Novo nome");
    await submit();
    await settle();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(field("name").value).toBe("Novo nome");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível salvar agora.");
    expect(button("Salvar alterações").disabled).toBe(false);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(goal), { status: 200 }));
    await submit();
    await settle();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(track.mock.calls).toEqual([
      ["goal_edit_opened", undefined],
      ["goal_edit_failed", { reason: "request" }],
      ["goal_edit_saved", undefined],
    ]);
  });

  it.each(["fechar", "escape", "fundo"])("registra cancelamento por %s uma única vez", async (method) => {
    await click("Editar meta");
    await act(async () => {
      if (method === "escape") window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      else if (method === "fechar") container.querySelector<HTMLButtonElement>('[aria-label="Fechar"]')!.click();
      else (container.querySelector('[role="dialog"]')!.previousElementSibling as HTMLElement).click();
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(track.mock.calls).toEqual([
      ["goal_edit_opened", undefined],
      ["goal_edit_cancelled", undefined],
    ]);
  });

  it.each(["ausente", "exceção", "rejeição"])("mantém o formulário funcional com rastreador: %s", async (mode) => {
    if (mode === "ausente") delete window.umami;
    else track.mockImplementation(() => {
      if (mode === "exceção") throw new Error("falha de analytics");
      return Promise.reject(new Error("falha de analytics"));
    });
    await click("Editar meta");
    await change("name", "Rascunho descartado");
    await click("Cancelar");
    await click("Editar meta");
    expect(field("name").value).toBe(goal.name);
    await change("name", "");
    await submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Informe o nome da meta.");
    await change("name", "Nome preservado");
    fetchMock.mockRejectedValueOnce(new Error("sem conexão"));
    await submit();
    await settle();
    expect(field("name").value).toBe("Nome preservado");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("sem conexão");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(goal), { status: 200 }));
    await submit();
    await settle();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(toast).toHaveBeenCalledWith("Meta “Nome preservado” atualizada");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renomeia e ajusta o objetivo de uma meta vencida sem prorrogar o prazo ou alterar o saldo", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await act(async () => {
      root.render(createElement(QueryClientProvider, { client },
        createElement(EditarMeta, { goal, saved: goal.saved, members: [], today: new Date(2026, 6, 15), currentMonth: "2026-07", availableIcons: ["flight"] }),
      ));
    });
    fetchMock.mockImplementation(async (_url, request) => {
      const body = JSON.parse(request.body);
      // Como o backend, aplica apenas os detalhes enviados à meta existente.
      const persisted = { ...goal, ...body };
      expect(body).toEqual({ name: "Viagem concluída", icon: "flight", target: 400.29 });
      expect(persisted).toMatchObject({ saved: 400.29, months: 6, startMonth: "2026-01" });
      return new Response(JSON.stringify(persisted), { status: 200 });
    });
    await click("Editar meta");
    expect(field("deadline").value).toBe("2026-06");
    await change("name", "Viagem concluída");
    await change("target", "400,29");
    await submit();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["snapshot"] });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(toast).toHaveBeenCalledWith("Meta “Viagem concluída” atualizada");
  });
});
