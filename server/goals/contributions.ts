import { and, eq } from "drizzle-orm";
import { z } from "zod";
import * as S from "@shared/schema";
import { hasFeature, type PlanId } from "@shared/plans";
import type { DB } from "../db";

export const contributionInput = z.object({
  amount: z.number().finite().min(0.01, "Informe um valor de pelo menos R$ 0,01.")
    .max(10_000_000, "O valor máximo por registro é R$ 10.000.000,00.")
    .refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
      "Informe um valor com no máximo duas casas decimais."),
}).strict();

export class GoalContributionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const cents = (value: number) => Math.round(value * 100);
type Contributor = Pick<S.User, "id" | "name" | "plan">;

/** Apenas acompanhamento: não altera contas bancárias, renda ou lançamentos. */
export async function recordGoalContribution(database: DB, user: Contributor, goalId: string, amount: number) {
  contributionInput.parse({ amount });
  if (!hasFeature(user.plan as PlanId, "metas")) {
    throw new GoalContributionError(402, "O registro de valores em metas está disponível a partir do plano Plus.");
  }
  return database.transaction(async (tx) => {
    // Serializa os aportes na mesma meta, sem sobrescrever valores concorrentes.
    const [goal] = await tx.select().from(S.goals)
      .where(and(eq(S.goals.id, goalId), eq(S.goals.userId, user.id))).for("update");
    if (!goal) throw new GoalContributionError(404, "Meta não encontrada.");
    if (goal.isGroup && !hasFeature(user.plan as PlanId, "metas_grupo")) {
      throw new GoalContributionError(402, "O registro em metas em grupo está disponível no plano Pilot.");
    }

    const members = goal.isGroup
      ? await tx.select().from(S.goalMembers)
        .where(and(eq(S.goalMembers.goalId, goal.id), eq(S.goalMembers.userId, user.id))).for("update")
      : [];
    const mine = members.filter((member) => member.isMe);
    if (mine.length > 1) throw new GoalContributionError(409, "Há mais de um participante marcado como você. Não foi possível registrar o valor com segurança.");
    const previousCents = goal.isGroup && members.length
      ? members.reduce((total, member) => total + cents(member.saved), 0)
      : cents(goal.saved);
    const savedCents = previousCents + cents(amount);
    if (savedCents > 99_999_999_999_999) {
      throw new GoalContributionError(400, "O total guardado excede o limite permitido.");
    }
    const saved = savedCents / 100;

    if (goal.isGroup) {
      if (mine[0]) {
        await tx.update(S.goalMembers).set({ saved: (cents(mine[0].saved) + cents(amount)) / 100 })
          .where(and(eq(S.goalMembers.id, mine[0].id), eq(S.goalMembers.userId, user.id)));
      } else {
        // Preserva um saldo anterior ainda sem participantes cadastrados.
        await tx.insert(S.goalMembers).values({
          userId: user.id, goalId: goal.id, name: user.name || "Você", isMe: true,
          saved: members.length ? amount : saved, privacy: goal.myPrivacy,
        });
      }
    }
    const [updated] = await tx.update(S.goals).set({ saved })
      .where(and(eq(S.goals.id, goal.id), eq(S.goals.userId, user.id))).returning();
    return { goal: updated, amount, saved };
  });
}
