// Grava a persona de demonstração (shared/demo/persona.ts) para um usuário.
import { eq } from "drizzle-orm";
import * as S from "@shared/schema";
import { buildPersona } from "@shared/demo/persona";
import { debtsFrom, payoffPlan } from "@shared/engine";
import { monthKey } from "@shared/format";
import { db } from "../db";
import { todayBR } from "../storage";

export async function seedPersona(userId: string) {
  const today = todayBR();
  const r = buildPersona(today, userId);
  const d = db();
  await d.transaction(async (tx) => {
    await tx.insert(S.incomes).values(r.incomes);
    await tx.insert(S.connections).values(r.connections);
    await tx.insert(S.accounts).values(r.accounts);
    await tx.insert(S.imports).values(r.imports);
    await tx.insert(S.expenseGroups).values(r.groups);
    for (let i = 0; i < r.transactions.length; i += 200) await tx.insert(S.transactions).values(r.transactions.slice(i, i + 200));
    await tx.insert(S.categoryRules).values(r.rules);
    await tx.insert(S.budgets).values(r.budgets);
    await tx.insert(S.subscriptions).values(r.subscriptions);
    await tx.insert(S.leaks).values(r.leaks);
    await tx.insert(S.commitments).values(r.commitments);
    await tx.insert(S.personalDebts).values(r.personalDebts);
    await tx.insert(S.personalDebtPayments).values(r.personalDebtPayments);
    await tx.insert(S.groupObligations).values(r.obligations);
    await tx.insert(S.goals).values(r.goals);
    await tx.insert(S.goalMembers).values(r.goalMembers);
    // Foto do mês passado: dívida um pouco maior e quitação 2 meses mais tarde.
    const plan = payoffPlan(debtsFrom(r.accounts, r.personalDebts, r.personalDebtPayments), today, r.debtBudget);
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const free = plan.debtFree ? new Date(plan.debtFree.getFullYear(), plan.debtFree.getMonth() + 2, 1) : null;
    await tx.insert(S.snapshots).values({ userId, month: monthKey(prev), totalDebt: plan.totalDebt + r.previousDebtExtra, payoffMonth: free ? monthKey(free) : null });
    const [u] = await tx.select().from(S.users).where(eq(S.users.id, userId));
    await tx.update(S.users).set({ prefs: { ...u.prefs, debtBudget: r.debtBudget } }).where(eq(S.users.id, userId));
    await tx.insert(S.chatMessages).values({ userId, role: "pp", kind: "text", text: "Oi, Marcos! Me conte um gasto, mande um áudio ou a foto de uma nota. Também respondo sobre o seu mês e o seu plano." });
  });
}
