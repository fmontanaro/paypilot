import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import * as S from "@shared/schema";
import { hasFeature, type PlanId } from "@shared/plans";
import { goalBalanceAfter } from "@shared/engine/goal-ledger";
import type { DB } from "../db";

const amountInput = z.number().finite().min(0.01, "Informe um valor de pelo menos R$ 0,01.")
  .max(10_000_000, "O valor máximo por registro é R$ 10.000.000,00.")
  .refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    "Informe um valor com no máximo duas casas decimais.");
export const contributionInput = z.object({ amount: amountInput }).strict();
export const contributionRequest = contributionInput.extend({ idempotencyKey: z.string().uuid() });
export const reversalInput = z.object({
  confirmed: z.literal(true),
  idempotencyKey: z.string().uuid(),
  reason: z.string().trim().min(3, "Informe o motivo com pelo menos 3 caracteres.").max(300),
  replacementAmount: amountInput.optional(),
}).strict();

export class GoalContributionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Contributor = Pick<S.User, "id" | "name" | "plan">;
type TX = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Entry = typeof S.goalContributions.$inferSelect;
const cents = (value: number) => Math.round(value * 100);

/** O lock na meta serializa inicialização, reenvios, aportes e correções. */
async function lockGoal(tx: TX, user: Contributor, goalId: string) {
  const [goal] = await tx.select().from(S.goals)
    .where(eq(S.goals.id, goalId)).for("update");
  if (!goal) throw new GoalContributionError(404, "Meta não encontrada.");
  const members = goal.isGroup ? await tx.select().from(S.goalMembers)
    .where(eq(S.goalMembers.goalId, goalId)).for("update") : [];
  const owner = goal.userId === user.id;
  if (!owner && (!goal.isGroup || !members.some((m) => m.accountId === user.id))) {
    throw new GoalContributionError(404, "Meta não encontrada.");
  }
  if (owner && !hasFeature(user.plan as PlanId, "metas")) {
    throw new GoalContributionError(402, "O histórico de metas está disponível a partir do plano Plus.");
  }
  if (owner && goal.isGroup && !hasFeature(user.plan as PlanId, "metas_grupo")) {
    throw new GoalContributionError(402, "O histórico de metas em grupo está disponível no plano Pilot.");
  }
  if (members.filter((m) => ownMember(m, user.id, goal)).length > 1) {
    throw new GoalContributionError(409, "Há mais de um participante marcado como você. Não foi possível alterar o saldo com segurança.");
  }
  return { goal, members };
}

async function entriesFor(tx: TX, userId: string, goalId: string) {
  return tx.select().from(S.goalContributions)
    .where(and(eq(S.goalContributions.goalId, goalId), eq(S.goalContributions.userId, userId)))
    .orderBy(asc(S.goalContributions.sequence));
}

/** Sem backfill na subida do Postgres: DML aditivo, uma única vez, sob lock. */
export async function initializeGoalHistory(tx: TX, user: Contributor, goal: S.Goal, members: S.GoalMember[]) {
  const existing = await entriesFor(tx, goal.userId, goal.id);
  if (existing.length) return existing;
  const base = { userId: goal.userId, goalId: goal.id, kind: "initial" as const };
  if (goal.isGroup && members.length) {
    await tx.insert(S.goalContributions).values(members.map((m) => ({
      ...base, memberId: m.id, participantName: m.name, amount: m.saved,
      actorId: m.accountId || (m.isMe ? goal.userId : null),
      // O responsável pelo valor antigo não é conhecido; não inventar autoria.
    })));
    const difference = (cents(goal.saved) - members.reduce((sum, m) => sum + cents(m.saved), 0)) / 100;
    if (difference !== 0) {
      // Preserva inclusive divergências legadas, sem atribuí-las a outra pessoa.
      await tx.insert(S.goalContributions).values({
        ...base, participantName: "Saldo anterior sem participante identificado", amount: difference,
      });
    }
  } else {
    // Sem participantes, o total legado de um grupo não comprova autoria.
    // A participação própria só será criada, com zero, ao registrar valor novo.
    await tx.insert(S.goalContributions).values({
      ...base, amount: goal.saved,
      participantName: goal.isGroup ? "Saldo anterior sem participante identificado" : user.name || "Você",
      actorId: goal.isGroup ? null : goal.userId,
    });
  }
  const historyStartedAt = new Date();
  await tx.update(S.goals).set({ historyStartedAt })
    .where(and(eq(S.goals.id, goal.id), eq(S.goals.userId, goal.userId)));
  goal.historyStartedAt = historyStartedAt;
  return entriesFor(tx, goal.userId, goal.id);
}

function ownMember(m: S.GoalMember, userId: string, goal: S.Goal) {
  return m.accountId === userId || (!m.accountId && m.isMe && goal.userId === userId);
}

function canCorrect(entry: Entry, user: Contributor, goal: S.Goal, members: S.GoalMember[]) {
  if (entry.actorId !== user.id || !["initial", "contribution"].includes(entry.kind)) return false;
  return !goal.isGroup || members.some((m) => m.id === entry.memberId && ownMember(m, user.id, goal));
}

function replay(entries: Entry[], key: string, fingerprint: string, actorId: string) {
  const previous = entries.find((e) => e.idempotencyKey === key);
  if (previous && (previous.requestFingerprint !== fingerprint || previous.actorId !== actorId)) {
    throw new GoalContributionError(409, "Este envio já foi usado para outro registro. Atualize o histórico antes de tentar novamente.");
  }
  return previous;
}

async function applyBalance(tx: TX, user: Contributor, goal: S.Goal, members: S.GoalMember[], delta: number, memberId?: string | null) {
  let saved: number;
  try { saved = goalBalanceAfter(goal.saved, delta); }
  catch { throw new GoalContributionError(400, "A alteração deixaria o total negativo ou excederia o limite permitido."); }
  if (goal.isGroup) {
    const mine = members.find((m) => m.id === memberId && ownMember(m, user.id, goal));
    if (!mine) throw new GoalContributionError(403, "Você só pode alterar a sua própria participação.");
    let memberSaved: number;
    try { memberSaved = goalBalanceAfter(mine.saved, delta); }
    catch { throw new GoalContributionError(400, "A alteração deixaria sua participação negativa ou excederia o limite permitido."); }
    await tx.update(S.goalMembers).set({ saved: memberSaved })
      .where(and(eq(S.goalMembers.id, mine.id), eq(S.goalMembers.userId, goal.userId)));
  }
  const [updated] = await tx.update(S.goals).set({ saved })
    .where(and(eq(S.goals.id, goal.id), eq(S.goals.userId, goal.userId))).returning();
  return updated;
}

export async function listGoalContributions(database: DB, user: Contributor, goalId: string) {
  return database.transaction(async (tx) => {
    const { goal, members } = await lockGoal(tx, user, goalId);
    const initialized = !goal.historyStartedAt;
    const entries = await initializeGoalHistory(tx, user, goal, members);
    const reversed = new Set(entries.map((e) => e.reversesId).filter(Boolean));
    return {
      saved: goal.saved,
      initialized,
      entries: entries.map((entry) => ({
        id: entry.id, kind: entry.kind, amount: entry.amount, createdAt: entry.createdAt,
        participantName: entry.participantName, actorName: entry.actorName,
        reversesId: entry.reversesId, replacesId: entry.replacesId, reason: entry.actorId === user.id ? entry.reason : null,
        reversed: reversed.has(entry.id),
        canCorrect: !reversed.has(entry.id) && canCorrect(entry, user, goal, members),
      })),
    };
  });
}

/** Apenas acompanhamento: não altera contas bancárias, renda ou lançamentos. */
export async function recordGoalContribution(database: DB, user: Contributor, goalId: string, amount: number, idempotencyKey: string = randomUUID()) {
  contributionRequest.parse({ amount, idempotencyKey });
  const fingerprint = JSON.stringify({ kind: "contribution", amount });
  return database.transaction(async (tx) => {
    const { goal, members } = await lockGoal(tx, user, goalId);
    const entries = await initializeGoalHistory(tx, user, goal, members);
    if (replay(entries, idempotencyKey, fingerprint, user.id)) return { amount, saved: goal.saved };
    let mine = members.find((m) => ownMember(m, user.id, goal));
    if (goal.isGroup && !mine) {
      [mine] = await tx.insert(S.goalMembers).values({
        userId: goal.userId, accountId: user.id, goalId, name: user.name || "Você", isMe: true, saved: 0, privacy: "contrib",
      }).returning();
      members.push(mine);
    }
    const updated = await applyBalance(tx, user, goal, members, amount, mine?.id);
    await tx.insert(S.goalContributions).values({
      userId: goal.userId, goalId, memberId: mine?.id, actorId: user.id,
      actorName: user.name, participantName: mine?.name || user.name || "Você",
      kind: "contribution", amount, idempotencyKey, requestFingerprint: fingerprint,
    });
    return { amount, saved: updated.saved };
  });
}

export async function reverseGoalContribution(database: DB, user: Contributor, goalId: string, entryId: string, input: unknown) {
  const body = reversalInput.parse(input);
  const fingerprint = JSON.stringify({ entryId, reason: body.reason, replacementAmount: body.replacementAmount ?? null });
  return database.transaction(async (tx) => {
    const { goal, members } = await lockGoal(tx, user, goalId);
    const entries = await initializeGoalHistory(tx, user, goal, members);
    if (replay(entries, body.idempotencyKey, fingerprint, user.id)) return { saved: goal.saved };
    const original = entries.find((e) => e.id === entryId);
    if (!original) throw new GoalContributionError(404, "Registro não encontrado nesta meta.");
    if (!canCorrect(original, user, goal, members)) {
      throw new GoalContributionError(403, "Você só pode corrigir ou estornar seus próprios registros.");
    }
    if (entries.some((e) => e.reversesId === original.id)) {
      throw new GoalContributionError(409, "Este registro já foi estornado ou corrigido. Atualize o histórico.");
    }
    const delta = ((body.replacementAmount === undefined ? 0 : cents(body.replacementAmount)) - cents(original.amount)) / 100;
    const updated = await applyBalance(tx, user, goal, members, delta, original.memberId);
    const base = {
      userId: goal.userId, goalId, memberId: original.memberId, actorId: user.id,
      actorName: user.name, participantName: original.participantName, reason: body.reason,
    };
    await tx.insert(S.goalContributions).values({
      ...base, kind: body.replacementAmount === undefined ? "reversal" : "correction",
      amount: -original.amount, reversesId: original.id,
      idempotencyKey: body.idempotencyKey, requestFingerprint: fingerprint,
    });
    if (body.replacementAmount !== undefined) {
      await tx.insert(S.goalContributions).values({
        ...base, kind: "contribution", amount: body.replacementAmount, replacesId: original.id,
      });
    }
    return { saved: updated.saved };
  });
}
