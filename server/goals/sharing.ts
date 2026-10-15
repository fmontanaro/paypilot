import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import * as S from "@shared/schema";
import { hasFeature, type PlanId } from "@shared/plans";
import type { DB } from "../db";

export class GoalSharingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const normalizeGoalContact = (s: string) => s.includes("@") ? s.trim().toLowerCase() : s.replace(/\D/g, "");
const contactInput = z.string().trim().max(120).transform(normalizeGoalContact)
  .refine((s) => s.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) : /^\d{10,13}$/.test(s),
    "Informe um e-mail ou celular válido.");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
type Identity = Pick<S.User, "id" | "email" | "phone" | "name" | "plan">;

export async function createGoalInvite(database: DB, user: Identity, goalId: string, input: unknown) {
  const { contact } = z.object({ contact: contactInput }).strict().parse(input);
  if (!hasFeature(user.plan as PlanId, "metas_grupo")) throw new GoalSharingError(402, "Convites estão disponíveis no plano Pilot.");
  const [goal] = await database.select().from(S.goals).where(and(eq(S.goals.id, goalId), eq(S.goals.userId, user.id)));
  if (!goal) throw new GoalSharingError(404, "Meta não encontrada.");
  if ([user.email, user.phone].filter(Boolean).some((s) => normalizeGoalContact(s!) === contact)) {
    throw new GoalSharingError(400, "Convide outra pessoa para a meta.");
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invite] = await database.insert(S.goalInvites).values({
    userId: user.id, goalId, contact, tokenHash: hash(token), expiresAt,
  }).returning();
  return { id: invite.id, contact, token, expiresAt };
}

/** O código prova posse do convite; o contato sozinho não é verificado pelo login atual. */
export async function acceptGoalInvite(database: DB, user: Identity, input: unknown) {
  const { token } = z.object({ token: z.string().trim().toLowerCase().regex(/^[a-f0-9]{64}$/, "Código de convite inválido.") }).strict().parse(input);
  return database.transaction(async (tx) => {
    const [candidate] = await tx.select().from(S.goalInvites).where(eq(S.goalInvites.tokenHash, hash(token)));
    const invalid = () => new GoalSharingError(404, "Convite inválido, expirado ou destinado a outra conta.");
    if (!candidate) throw invalid();
    // Ordem de locks consistente: meta antes do convite e dos participantes.
    const [goal] = await tx.select().from(S.goals).where(eq(S.goals.id, candidate.goalId)).for("update");
    const [invite] = await tx.select().from(S.goalInvites).where(eq(S.goalInvites.id, candidate.id)).for("update");
    if (!goal || !invite || user.id === goal.userId ||
      ![user.email, user.phone].filter(Boolean).some((s) => normalizeGoalContact(s!) === invite.contact)) throw invalid();
    if (invite.acceptedAt) {
      if (invite.acceptedBy !== user.id) throw invalid();
      return { goalId: goal.id };
    }
    if (!invite.expiresAt || invite.expiresAt <= new Date()) throw invalid();
    // Captura o saldo individual ANTES de converter: não perder a autoria comprovada.
    if (!goal.isGroup) {
      const { initializeGoalHistory } = await import("./contributions");
      const [owner] = await tx.select().from(S.users).where(eq(S.users.id, goal.userId));
      await initializeGoalHistory(tx, { id: goal.userId, name: owner?.name || "Proprietário", plan: "pilot" }, goal, []);
      const [member] = await tx.insert(S.goalMembers).values({
        userId: goal.userId, accountId: goal.userId, goalId: goal.id,
        name: owner?.name || "Proprietário", isMe: true, saved: goal.saved, privacy: "contrib",
      }).returning();
      await tx.update(S.goalContributions).set({ memberId: member.id }).where(and(
        eq(S.goalContributions.goalId, goal.id), eq(S.goalContributions.actorId, goal.userId),
      ));
      await tx.update(S.goals).set({ isGroup: true, myPrivacy: "contrib" }).where(eq(S.goals.id, goal.id));
    }
    await tx.insert(S.goalMembers).values({
      userId: goal.userId, accountId: user.id, goalId: goal.id, name: user.name || "Participante",
      saved: 0, isMe: false, privacy: "contrib",
    }).onConflictDoNothing();
    await tx.update(S.goalInvites).set({ acceptedBy: user.id, acceptedAt: new Date() }).where(eq(S.goalInvites.id, invite.id));
    return { goalId: goal.id };
  });
}

/** Projeção explícita: nenhuma renda, fonte de economia ou contato alheio compartilhado. */
export async function loadVisibleGoals(database: DB, userId: string) {
  const owned = await database.select().from(S.goals).where(eq(S.goals.userId, userId));
  const memberships = await database.select().from(S.goalMembers).where(eq(S.goalMembers.accountId, userId));
  const sharedIds = memberships.map((m) => m.goalId).filter((id) => !owned.some((g) => g.id === id));
  const shared = sharedIds.length ? await database.select().from(S.goals).where(inArray(S.goals.id, sharedIds)) : [];
  const goals = [...owned, ...shared.map((g) => ({ ...g, sources: [], myPrivacy: "contrib" }))];
  const members = goals.length ? await database.select().from(S.goalMembers).where(inArray(S.goalMembers.goalId, goals.map((g) => g.id))) : [];
  return {
    goals,
    goalMembers: members.map((m) => ({
      ...m, income: null, privacy: "contrib", accountId: m.accountId === userId ? userId : null,
      isMe: m.accountId === userId || (!m.accountId && m.userId === userId && m.isMe),
    })),
  };
}
