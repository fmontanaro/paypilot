import { and, eq } from "drizzle-orm";
import { z } from "zod";
import * as S from "@shared/schema";
import { hasFeature, type PlanId } from "@shared/plans";
import { monthKey } from "@shared/format";
import type { DB } from "../db";

const monthInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe um mês válido para o prazo.");
export const goalPatchInput = z.object({
  name: z.string().trim().min(1, "Informe o nome da meta.").max(60, "Use até 60 caracteres no nome.").optional(),
  icon: z.string().trim().min(1, "Escolha um ícone.").max(40).regex(/^[a-z0-9_]+$/, "Escolha um ícone válido.").optional(),
  target: z.number().finite().min(0.01, "O objetivo deve ser de pelo menos R$ 0,01.")
    .max(10_000_000, "O objetivo máximo é R$ 10.000.000,00.")
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001, "Use no máximo duas casas decimais.").optional(),
  deadline: monthInput.optional(),
  splitMode: z.enum(["igual", "prop"]).optional(),
  myPrivacy: z.enum(["contrib", "cats"]).optional(),
}).strict().refine((b) => Object.keys(b).length > 0, "Informe o que deseja editar.");

export class GoalEditError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const monthIndex = (month: string) => {
  const [year, number] = month.split("-").map(Number);
  return year * 12 + number - 1;
};

/** Altera somente os detalhes pedidos, nunca o início nem os valores guardados. */
export async function updateGoal(database: DB, user: Pick<S.User, "id" | "plan">, goalId: string, body: unknown, today: Date) {
  const b = goalPatchInput.parse(body);
  if (!hasFeature(user.plan as PlanId, "metas")) {
    throw new GoalEditError(402, "A edição de metas está disponível a partir do plano Plus.");
  }
  return database.transaction(async (tx) => {
    const ownerFilter = and(eq(S.goals.id, goalId), eq(S.goals.userId, user.id));
    // O mesmo bloqueio usado nos registros impede a perda de alterações concorrentes.
    const [goal] = await tx.select().from(S.goals).where(ownerFilter).for("update");
    if (!goal) throw new GoalEditError(404, "Meta não encontrada.");
    if ((goal.isGroup || b.splitMode !== undefined || b.myPrivacy !== undefined) && !hasFeature(user.plan as PlanId, "metas_grupo")) {
      throw new GoalEditError(402, "A edição de metas em grupo está disponível no plano Pilot.");
    }
    const changes: Partial<Pick<S.Goal, "name" | "icon" | "target" | "months" | "splitMode" | "myPrivacy">> = {};
    if (b.name !== undefined) changes.name = b.name;
    if (b.icon !== undefined) changes.icon = b.icon;
    if (b.target !== undefined) changes.target = b.target;
    if (b.splitMode !== undefined) changes.splitMode = b.splitMode;
    if (b.myPrivacy !== undefined) changes.myPrivacy = b.myPrivacy;
    if (b.deadline !== undefined) {
      const months = monthIndex(b.deadline) - monthIndex(goal.startMonth) + 1;
      if (months < 1 || months > 120) {
        throw new GoalEditError(400, "O prazo deve ficar entre 1 e 120 meses a partir do início original.");
      }
      if (b.deadline < monthKey(today)) {
        throw new GoalEditError(400, "Escolha o mês atual ou um mês futuro para o prazo.");
      }
      changes.months = months;
    }
    const [updated] = await tx.update(S.goals).set(changes).where(ownerFilter).returning();
    if (b.myPrivacy !== undefined) {
      await tx.update(S.goalMembers).set({ privacy: b.myPrivacy }).where(and(
        eq(S.goalMembers.goalId, goal.id), eq(S.goalMembers.userId, user.id), eq(S.goalMembers.isMe, true),
      ));
    }
    return updated;
  });
}
