// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoricoMeta } from "./HistoricoMeta";

vi.mock("@/lib/app", () => ({ useApp: () => ({ bp: "desktop" }) }));

const entries = [
  {
    id: "contrib-1", kind: "contribution" as const, amount: 80.25, createdAt: "2026-02-12T12:00:00.000Z",
    participantName: "Ana", actorName: null, reversesId: null, canCorrect: true, reversed: false,
  },
  {
    id: "initial-1", kind: "initial" as const, amount: 120, createdAt: "2026-02-01T12:00:00.000Z",
    participantName: "Ana", actorName: "Ana", reversesId: null, canCorrect: false, reversed: false,
  },
];
let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "uuid-stable") });
  fetchMock = vi.fn(async (url: string, request?: RequestInit) => {
    if (request?.method === "POST") return new Response(JSON.stringify({ error: "Falha temporária." }), { status: 500 });
    return new Response(JSON.stringify({ saved: 200.25, entries }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root.render(createElement(QueryClientProvider, { client }, createElement(HistoricoMeta, { goalId: "goal-test" })));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});

const button = (text: string) => [...container.querySelectorAll("button")].find((el) => el.textContent?.trim().includes(text))!;
const click = async (text: string) => act(async () => button(text).click());
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
async function change(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    element.value = value;
    Simulate.change(element);
  });
}

describe("histórico de valores da meta", () => {
  it("carrega sob demanda, identifica o saldo inicial e mostra data, valor e responsável", async () => {
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Histórico de valores");
    await settle();
    expect(fetchMock).toHaveBeenCalledWith("/api/goals/goal-test/contributions", expect.objectContaining({ method: "GET" }));
    expect(container.textContent).toContain("Valor guardado");
    expect(container.textContent).toContain("R$ 80,25");
    expect(container.textContent).toContain("responsável: Ana");
    expect(container.textContent).toContain("Data anterior desconhecida");
    expect(container.textContent).toContain("histórico iniciado em");
  });

  it("permite cancelar a confirmação sem escrever e mantém o rascunho e a chave numa tentativa após erro", async () => {
    await click("Histórico de valores");
    await settle();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label^="Corrigir ou estornar"]')!.click());
    const reason = container.querySelector("textarea")!;
    await change(reason, "Valor lançado incorretamente");
    await click("Cancelar");
    expect(fetchMock.mock.calls.filter(([, request]) => request?.method === "POST")).toHaveLength(0);

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label^="Corrigir ou estornar"]')!.click());
    await change(container.querySelector("textarea")!, "Valor lançado incorretamente");
    await click("Confirmar ajuste");
    await settle();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Falha temporária.");
    expect(container.querySelector("textarea")?.value).toBe("Valor lançado incorretamente");

    fetchMock.mockImplementation(async (_url: string, request?: RequestInit) => {
      if (request?.method === "POST") return new Response(JSON.stringify({ saved: 120 }), { status: 200 });
      return new Response(JSON.stringify({ saved: 200.25, entries }), { status: 200 });
    });
    await click("Confirmar ajuste");
    await settle();
    const writes = fetchMock.mock.calls.filter(([, request]) => request?.method === "POST");
    expect(writes).toHaveLength(2);
    const firstBody = JSON.parse(writes[0][1].body as string);
    const retryBody = JSON.parse(writes[1][1].body as string);
    expect(firstBody).toEqual({
      confirmed: true,
      idempotencyKey: "uuid-stable",
      reason: "Valor lançado incorretamente",
      replacementAmount: 80.25,
    });
    expect(retryBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("mostra estado de erro e permite recarregar", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await click("Histórico de valores");
    await settle();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível carregar");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ saved: 0, entries: [] }), { status: 200 }));
    await click("Tentar de novo");
    await settle();
    expect(container.textContent).toContain("Nenhum valor registrado ainda");
  });

  it("exige motivo e confirma o estorno integral sem enviar um valor substituto", async () => {
    await click("Histórico de valores");
    await settle();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label^="Corrigir ou estornar"]')!.click());
    await click("Estornar tudo");
    expect(button("Confirmar ajuste").disabled).toBe(true);
    expect(container.querySelector("input")).toBeNull();
    await change(container.querySelector("textarea")!, "Registro duplicado");
    expect(container.textContent).toContain("R$ 120,00");
    fetchMock.mockImplementation(async (_url: string, request?: RequestInit) => {
      if (request?.method === "POST") return new Response(JSON.stringify({ saved: 120 }), { status: 200 });
      return new Response(JSON.stringify({ saved: 120, entries: [] }), { status: 200 });
    });
    await click("Confirmar ajuste");
    await settle();
    const writes = fetchMock.mock.calls.filter(([, request]) => request?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0][1].body as string)).toEqual({
      confirmed: true, idempotencyKey: "uuid-stable", reason: "Registro duplicado",
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("não oferece correção para valores de terceiros ou registros já estornados", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      saved: 120,
      entries: entries.map((entry) => ({ ...entry, canCorrect: false, reversed: entry.kind === "contribution" })),
    }), { status: 200 }));
    await click("Histórico de valores");
    await settle();
    expect(container.querySelector('[aria-label^="Corrigir ou estornar"]')).toBeNull();
    expect(container.textContent).toContain("Valor estornado");
  });
});
