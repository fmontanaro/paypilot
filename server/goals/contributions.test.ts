import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";
import path from "node:path";
import * as S from "@shared/schema";
import { goalView } from "@shared/engine/goals";
import type { DB } from "../db";
import { contributionInput, recordGoalContribution } from "./contributions";

const client = new PGlite("memory://");
const database = drizzle({ client, schema: S });
const connectionDb = database as unknown as DB;
const owner = { id: "owner", name: "Teste", plan: "plus" };
const pilot = { ...owner, plan: "pilot" };

beforeAll(async () => {
  await migrate(database, { migrationsFolder: path.resolve(import.meta.dirname, "../../migrations") });
  await database.insert(S.users).values([owner, { id: "other", name: "Outro" }]);
}, 15000);
afterAll(async () => { await client.close(); });

async function fixture(saved = 0, isGroup = false) {
  const [goal] = await database.insert(S.goals).values({
    userId: owner.id, name: "Viagem", target: 2000, months: 12,
    startMonth: "2026-10", saved, isGroup,
  }).returning();
  return goal;
}
const getGoal = async (id: string) => (await database.select().from(S.goals).where(eq(S.goals.id, id)))[0];

describe("valores guardados em metas", () => {
  it("soma ao valor anterior e persiste sem alterar contas ou lançamentos", async () => {
    const goal = await fixture(1000);
    const result = await recordGoalContribution(connectionDb, owner, goal.id, 500);
    expect(result).toMatchObject({ amount: 500, saved: 1500, goal: { id: goal.id, saved: 1500 } });
    expect((await getGoal(goal.id)).saved).toBe(1500);
    const view = goalView(await getGoal(goal.id), [], new Date(2026, 9, 15));
    expect(view.pct).toBe(0.75);
    expect(view.monthly).toBeCloseTo(500 / 12);
    expect(await database.select().from(S.accounts)).toHaveLength(0);
    expect(await database.select().from(S.transactions)).toHaveLength(0);
  });

  it("mantém centavos exatos ao registrar vários valores", async () => {
    const goal = await fixture();
    await recordGoalContribution(connectionDb, owner, goal.id, 0.1);
    await recordGoalContribution(connectionDb, owner, goal.id, 0.2);
    expect((await getGoal(goal.id)).saved).toBe(0.3);
  });

  it("não perde valores quando dois registros chegam juntos", async () => {
    const goal = await fixture(100);
    await Promise.all([
      recordGoalContribution(connectionDb, owner, goal.id, 50),
      recordGoalContribution(connectionDb, owner, goal.id, 75),
    ]);
    expect((await getGoal(goal.id)).saved).toBe(225);
  });

  it("permite atingir ou ultrapassar o objetivo sem reduzir o valor informado", async () => {
    const goal = await fixture(1900);
    await recordGoalContribution(connectionDb, owner, goal.id, 200);
    const view = goalView(await getGoal(goal.id), [], new Date(2026, 9, 15));
    expect(view.saved).toBe(2100);
    expect(view.monthly).toBe(0);
  });

  it("não permite registrar valores em uma meta de outro usuário", async () => {
    const goal = await fixture(100);
    await expect(recordGoalContribution(connectionDb, { ...owner, id: "other" }, goal.id, 50))
      .rejects.toMatchObject({ status: 404 });
    expect((await getGoal(goal.id)).saved).toBe(100);
  });

  it("informa que uma meta inexistente não foi encontrada", async () => {
    await expect(recordGoalContribution(connectionDb, owner, "missing", 50)).rejects.toMatchObject({ status: 404 });
  });

  it("respeita os planos para metas individuais e em grupo", async () => {
    const goal = await fixture();
    await expect(recordGoalContribution(connectionDb, { ...owner, plan: "gratis" }, goal.id, 50))
      .rejects.toMatchObject({ status: 402 });
    const group = await fixture(100, true);
    await expect(recordGoalContribution(connectionDb, owner, group.id, 50)).rejects.toMatchObject({ status: 402 });
    expect((await getGoal(group.id)).saved).toBe(100);
  });

  it("soma somente à contribuição do próprio participante em metas de grupo", async () => {
    const goal = await fixture(300, true);
    await database.insert(S.goalMembers).values([
      { userId: owner.id, goalId: goal.id, name: "Você", isMe: true, saved: 100 },
      { userId: owner.id, goalId: goal.id, name: "Outra pessoa", isMe: false, saved: 200 },
    ]);
    await recordGoalContribution(connectionDb, pilot, goal.id, 50);
    const members = await database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, goal.id));
    expect(members.find((member) => member.isMe)?.saved).toBe(150);
    expect(members.find((member) => !member.isMe)?.saved).toBe(200);
    expect(goalView(await getGoal(goal.id), members, new Date()).saved).toBe(350);
    expect((await getGoal(goal.id)).saved).toBe(350);
  });

  it("preserva o saldo de metas de grupo sem participantes", async () => {
    const goal = await fixture(300, true);
    await recordGoalContribution(connectionDb, pilot, goal.id, 50);
    const members = await database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, goal.id));
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ isMe: true, saved: 50 });
    expect(goalView(await getGoal(goal.id), members, new Date()).saved).toBe(350);
  });

  it("cria apenas a própria participação quando existem somente outros participantes", async () => {
    const goal = await fixture(200, true);
    await database.insert(S.goalMembers).values({
      userId: owner.id, goalId: goal.id, name: "Outra pessoa", isMe: false, saved: 200,
    });
    await recordGoalContribution(connectionDb, pilot, goal.id, 50);
    const members = await database.select().from(S.goalMembers)
      .where(and(eq(S.goalMembers.goalId, goal.id), eq(S.goalMembers.isMe, true)));
    expect(members[0].saved).toBe(50);
    expect((await getGoal(goal.id)).saved).toBe(250);
  });
});

describe("validação de valores guardados", () => {
  it.each([0, -1, NaN, Infinity, 0.001, 0.0000000001, 10_000_000.01, "500", "", null, undefined])("rejeita valor inválido: %s", (amount) => {
    expect(contributionInput.safeParse({ amount }).success).toBe(false);
  });
  it("aceita centavos e rejeita campos adicionais", () => {
    expect(contributionInput.safeParse({ amount: 0.01 }).success).toBe(true);
    expect(contributionInput.safeParse({ amount: 500, saved: 5000 }).success).toBe(false);
  });
});
