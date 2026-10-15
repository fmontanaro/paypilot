// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarValorGuardado } from "./RegistrarValorGuardado";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/lib/app", () => ({ useApp: () => ({ toast }) }));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let nextUuid = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `uuid-${++nextUuid}` });
  fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Resposta incerta." }), { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ amount: 80, saved: 180, goal: {} }), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ amount: 20, saved: 200, goal: {} }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  toast.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root.render(createElement(QueryClientProvider, { client }, createElement(RegistrarValorGuardado, { goalId: "goal-test", goalName: "Viagem", saved: 100 })));
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
async function enterAmount(value: string) {
  await act(async () => {
    const field = container.querySelector<HTMLInputElement>("#contribution-amount-goal-test")!;
    field.value = value;
    Simulate.change(field);
  });
}
async function submit() {
  await act(async () => Simulate.submit(container.querySelector("form")!));
}

describe("registro de valor guardado", () => {
  it("reutiliza a chave após falha incerta e cria outra após sucesso", async () => {
    await click("Registrar valor guardado");
    await enterAmount("80,00");
    await submit();
    await settle();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Resposta incerta.");
    await submit();
    await settle();
    const firstWrites = fetchMock.mock.calls.slice(0, 2).map(([, request]) => JSON.parse(request.body));
    expect(firstWrites[0]).toEqual({ amount: 80, idempotencyKey: "uuid-1" });
    expect(firstWrites[1]).toEqual(firstWrites[0]);
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    await click("Registrar valor guardado");
    await enterAmount("20,00");
    await submit();
    await settle();
    const lastBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(lastBody).toEqual({ amount: 20, idempotencyKey: "uuid-2" });
  });
});
