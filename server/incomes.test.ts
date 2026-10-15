import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as S from "@shared/schema";
import { monthlyIncome } from "@shared/engine";
import { nextDay } from "@shared/engine/finance";
import type { DB } from "./db";
import { createIncome, deleteIncome, incomeInput, incomePatchInput, listIncomes, updateIncome } from "./incomes";

const client = new PGlite("memory://");
const database = drizzle({ client, schema: S });
const connectionDb = database as unknown as DB;
const input = { name: "Salário", amount: 5000.5, payDay: 5, recurring: true };

beforeAll(async () => {
  await migrate(database, { migrationsFolder: path.resolve(import.meta.dirname, "../migrations") });
  await database.insert(S.users).values([
    { id: "owner", name: "Teste", plan: "gratis" },
    { id: "other", name: "Outro", plan: "gratis" },
  ]);
}, 15000);
afterAll(async () => { await client.close(); });

describe("gerenciamento de rendas", () => {
  it("cadastra com centavos, edita e exclui sem movimentar dinheiro", async () => {
    const income = await createIncome(connectionDb, "owner", { ...input, name: "  Salário  " });
    expect(income).toMatchObject({ userId: "owner", name: "Salário", amount: 5000.5, payDay: 5, recurring: true });
    const edited = await updateIncome(connectionDb, "owner", income.id, { amount: 5500.75, payDay: 31 });
    expect(edited).toMatchObject({ name: "Salário", amount: 5500.75, payDay: 31 });
    expect((await listIncomes(connectionDb, "owner")).find((i) => i.id === income.id)).toEqual(edited);
    expect(await deleteIncome(connectionDb, "owner", income.id)).toEqual({ ok: true });
    expect((await listIncomes(connectionDb, "owner")).some((i) => i.id === income.id)).toBe(false);
    expect(await database.select().from(S.accounts)).toHaveLength(0);
    expect(await database.select().from(S.transactions)).toHaveLength(0);
  });

  it("soma apenas rendas incluídas na previsão e recalcula ao editar ou excluir", async () => {
    const first = await createIncome(connectionDb, "owner", { ...input, amount: 0.1 });
    const second = await createIncome(connectionDb, "owner", { ...input, name: "Aluguel", amount: 0.2 });
    const excluded = await createIncome(connectionDb, "owner", { ...input, amount: 1000, recurring: false });
    const rows = () => listIncomes(connectionDb, "owner");
    expect(monthlyIncome(await rows())).toBeCloseTo(0.3, 12);
    await updateIncome(connectionDb, "owner", excluded.id, { recurring: true });
    expect(monthlyIncome(await rows())).toBeCloseTo(1000.3, 12);
    await updateIncome(connectionDb, "owner", excluded.id, { recurring: false });
    await deleteIncome(connectionDb, "owner", second.id);
    expect(monthlyIncome(await rows())).toBe(0.1);
    await deleteIncome(connectionDb, "owner", first.id);
    await deleteIncome(connectionDb, "owner", excluded.id);
  });

  it("não lista, altera ou exclui rendas de outro usuário", async () => {
    const income = await createIncome(connectionDb, "owner", input);
    expect(await listIncomes(connectionDb, "other")).toHaveLength(0);
    await expect(updateIncome(connectionDb, "other", income.id, { amount: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(deleteIncome(connectionDb, "other", income.id)).rejects.toMatchObject({ status: 404 });
    expect((await listIncomes(connectionDb, "owner")).find((i) => i.id === income.id)?.amount).toBe(input.amount);
    await deleteIncome(connectionDb, "owner", income.id);
  });

  it("informa que rendas já removidas ou inexistentes não foram encontradas", async () => {
    await expect(updateIncome(connectionDb, "owner", "missing", { name: "Nova" })).rejects.toMatchObject({ status: 404 });
    await expect(deleteIncome(connectionDb, "owner", "missing")).rejects.toMatchObject({ status: 404 });
  });

  it("inclui novas rendas por padrão e ajusta o dia 31 ao mês curto", async () => {
    const { recurring: _, ...withoutRecurring } = input;
    const income = await createIncome(connectionDb, "owner", withoutRecurring);
    expect(income.recurring).toBe(true);
    expect(nextDay(new Date(2026, 1, 1), 31)).toEqual(new Date(2026, 1, 28));
    await deleteIncome(connectionDb, "owner", income.id);
  });
});

describe("validação de rendas", () => {
  it.each([0, -1, 0.001, 0.0000000001, NaN, Infinity, 10_000_000.01, "500", null])("rejeita valor inválido %s", (amount) => {
    expect(incomeInput.safeParse({ ...input, amount }).success).toBe(false);
  });
  it.each([0, 32, -1, 1.5, "5", null])("rejeita dia inválido %s", (payDay) => {
    expect(incomeInput.safeParse({ ...input, payDay }).success).toBe(false);
  });
  it("rejeita nome vazio, alterações vazias, flags inválidas e tentativa de trocar o proprietário", () => {
    expect(incomeInput.safeParse({ ...input, name: "   " }).success).toBe(false);
    expect(incomeInput.safeParse({ ...input, recurring: "false" }).success).toBe(false);
    expect(incomeInput.safeParse({ ...input, userId: "other" }).success).toBe(false);
    expect(incomePatchInput.safeParse({}).success).toBe(false);
    expect(incomePatchInput.safeParse({ userId: "other" }).success).toBe(false);
  });
});
