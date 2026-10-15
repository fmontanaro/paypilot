import { and, eq } from "drizzle-orm";
import { z } from "zod";
import * as S from "@shared/schema";
import type { DB } from "./db";

const incomeFields = z.object({
  name: z.string().trim().min(1, "Informe o nome da renda.").max(80, "O nome deve ter até 80 caracteres."),
  amount: z.number().finite().min(0.01, "Informe um valor de pelo menos R$ 0,01.")
    .max(10_000_000, "O valor máximo é R$ 10.000.000,00.")
    .refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
      "Informe um valor com no máximo duas casas decimais."),
  payDay: z.number().int().min(1, "O dia deve estar entre 1 e 31.").max(31, "O dia deve estar entre 1 e 31."),
  recurring: z.boolean(),
}).strict();

export const incomeInput = incomeFields.extend({ recurring: z.boolean().default(true) });
export const incomePatchInput = incomeFields.partial()
  .refine((body) => Object.keys(body).length > 0, "Informe o que deseja alterar.");

export class IncomeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Previsões manuais: nunca criam recebimentos ou alteram transações bancárias. */
export function listIncomes(database: DB, userId: string) {
  return database.select().from(S.incomes).where(eq(S.incomes.userId, userId)).orderBy(S.incomes.createdAt);
}

export async function createIncome(database: DB, userId: string, body: unknown) {
  const input = incomeInput.parse(body);
  const [income] = await database.insert(S.incomes).values({ ...input, userId }).returning();
  return income;
}

export async function updateIncome(database: DB, userId: string, id: string, body: unknown) {
  const input = incomePatchInput.parse(body);
  const [income] = await database.update(S.incomes).set(input)
    .where(and(eq(S.incomes.id, id), eq(S.incomes.userId, userId))).returning();
  if (!income) throw new IncomeError(404, "Renda não encontrada.");
  return income;
}

export async function deleteIncome(database: DB, userId: string, id: string) {
  const [income] = await database.delete(S.incomes)
    .where(and(eq(S.incomes.id, id), eq(S.incomes.userId, userId))).returning({ id: S.incomes.id });
  if (!income) throw new IncomeError(404, "Renda não encontrada.");
  return { ok: true };
}
