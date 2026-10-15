// Acesso a dados. Toda consulta filtra pelo usuário da sessão.
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import * as S from "@shared/schema";
import type { PublicUser, Section, User } from "@shared/schema";
import type { AppData } from "@shared/engine";
import { isoDate, monthKey } from "@shared/format";
import { db } from "./db";
import { applyComplimentaryPlan } from "./entitlements";

export function publicUser(u: User): PublicUser {
  const { passwordHash: _ph, ...rest } = applyComplimentaryPlan(u);
  return { ...rest, name: rest.name || "" };
}

export async function getUser(id: string): Promise<User | undefined> {
  const [u] = await db().select().from(S.users).where(eq(S.users.id, id));
  return u ? applyComplimentaryPlan(u) : undefined;
}

export async function findUserByIdent(ident: string): Promise<User | undefined> {
  const isEmail = ident.includes("@");
  const [u] = await db()
    .select()
    .from(S.users)
    .where(isEmail ? eq(S.users.email, ident.toLowerCase()) : eq(S.users.phone, ident));
  return u ? applyComplimentaryPlan(u) : undefined;
}

/** Hoje no fuso de São Paulo, sem horário. */
export function todayBR(): Date {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function loadAppData(userId: string): Promise<AppData> {
  const d = db();
  const today = todayBR();
  const since = isoDate(new Date(today.getFullYear(), today.getMonth() - 6, 1));
  const month = monthKey(today);
  const user = (await getUser(userId))!;
  const [
    incomes,
    connections,
    accounts,
    imports,
    transactions,
    splits,
    rules,
    budgets,
    subscriptions,
    leaks,
    commitments,
    decisions,
    rolloverChoices,
    snapshots,
    personalDebts,
    personalDebtPayments,
    groups,
    obligations,
    goals,
    goalMembers,
    goalInvites,
    wa,
    chat,
  ] = await Promise.all([
    d.select().from(S.incomes).where(eq(S.incomes.userId, userId)),
    d.select().from(S.connections).where(eq(S.connections.userId, userId)).orderBy(S.connections.createdAt),
    d.select().from(S.accounts).where(eq(S.accounts.userId, userId)).orderBy(S.accounts.createdAt),
    d.select().from(S.imports).where(eq(S.imports.userId, userId)).orderBy(desc(S.imports.createdAt)),
    d.select().from(S.transactions).where(and(eq(S.transactions.userId, userId), gte(S.transactions.date, since))).orderBy(desc(S.transactions.date)),
    d.select().from(S.transactionSplits).where(eq(S.transactionSplits.userId, userId)),
    d.select().from(S.categoryRules).where(eq(S.categoryRules.userId, userId)).orderBy(S.categoryRules.createdAt),
    d.select().from(S.budgets).where(eq(S.budgets.userId, userId)).orderBy(S.budgets.createdAt),
    d.select().from(S.subscriptions).where(eq(S.subscriptions.userId, userId)).orderBy(S.subscriptions.createdAt),
    d.select().from(S.leaks).where(eq(S.leaks.userId, userId)),
    d.select().from(S.commitments).where(eq(S.commitments.userId, userId)).orderBy(S.commitments.sort),
    d.select().from(S.priorityDecisions).where(and(eq(S.priorityDecisions.userId, userId), eq(S.priorityDecisions.month, month))),
    d.select().from(S.rolloverChoices).where(and(eq(S.rolloverChoices.userId, userId), eq(S.rolloverChoices.month, month))),
    d.select().from(S.snapshots).where(eq(S.snapshots.userId, userId)),
    d.select().from(S.personalDebts).where(eq(S.personalDebts.userId, userId)),
    d.select().from(S.personalDebtPayments).where(eq(S.personalDebtPayments.userId, userId)).orderBy(desc(S.personalDebtPayments.date)),
    d.select().from(S.expenseGroups).where(eq(S.expenseGroups.userId, userId)),
    d.select().from(S.groupObligations).where(eq(S.groupObligations.userId, userId)),
    d.select().from(S.goals).where(eq(S.goals.userId, userId)).orderBy(S.goals.createdAt),
    d.select().from(S.goalMembers).where(eq(S.goalMembers.userId, userId)),
    d.select().from(S.goalInvites).where(eq(S.goalInvites.userId, userId)),
    d.select().from(S.whatsappLinks).where(eq(S.whatsappLinks.userId, userId)),
    d
      .select({ n: sql<number>`count(*)::int` })
      .from(S.chatMessages)
      .where(and(eq(S.chatMessages.userId, userId), eq(S.chatMessages.role, "me"), gte(S.chatMessages.createdAt, new Date(today.getFullYear(), today.getMonth(), 1)))),
  ]);
  const whatsapp = wa[0] ? (({ codeHash: _c, ...rest }) => rest)(wa[0]) : null;
  return {
    today: isoDate(today),
    user: publicUser(user),
    incomes,
    connections,
    accounts,
    imports,
    transactions,
    splits,
    rules,
    budgets,
    subscriptions,
    leaks,
    commitments,
    decisions: Object.fromEntries(decisions.map((x) => [x.commitmentId, x.section as Section])),
    rolloverChoices,
    snapshots,
    personalDebts,
    personalDebtPayments,
    groups,
    obligations,
    goals,
    goalMembers,
    goalInvites,
    whatsapp,
    chatCount: chat[0]?.n ?? 0,
  };
}

/** Apaga todos os dados do usuário (cascata) e as sessões dele. */
export async function deleteUserData(userId: string) {
  await db().delete(S.sessions).where(eq(S.sessions.userId, userId));
  await db().delete(S.users).where(eq(S.users.id, userId));
}

export async function userSessions(userId: string) {
  return db()
    .select({ sid: S.sessions.sid, device: S.sessions.device, createdAt: S.sessions.createdAt, lastSeenAt: S.sessions.lastSeenAt })
    .from(S.sessions)
    .where(and(eq(S.sessions.userId, userId), gte(S.sessions.expire, new Date())))
    .orderBy(desc(S.sessions.lastSeenAt));
}

export async function endSession(userId: string, sid: string) {
  await db()
    .delete(S.sessions)
    .where(and(eq(S.sessions.userId, userId), eq(S.sessions.sid, sid)));
}

export { S, and, eq, inArray, desc };
