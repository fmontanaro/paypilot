import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as S from "@shared/schema";
import { goalCalc, goalUntil, goalView, groupShares } from "@shared/engine/goals";
import type { DB } from "../db";
import { goalPatchInput, updateGoal } from "./edit";
import { recordGoalContribution } from "./contributions";

const client = new PGlite("memory://");
const database = drizzle({ client, schema: S });
const connection = database as unknown as DB;
const owner = { id: "edit-owner", name: "Teste", plan: "plus" };
const today = new Date(2026, 9, 15);
const valid = { name: "  Notebook novo  ", icon: "laptop_mac", target: 3500.29, deadline: "2027-01" };

beforeAll(async () => {
  await migrate(database, { migrationsFolder: path.resolve(import.meta.dirname, "../../migrations") });
  await database.insert(S.users).values([owner, { id: "edit-other", name: "Outra pessoa", plan: "pilot" }]);
}, 15000);
afterAll(async () => { await client.close(); });

async function fixture(isGroup = false) {
  return (await database.insert(S.goals).values({
    userId: owner.id, name: "Viagem", icon: "flight", target: 2000, saved: 500.25,
    months: 12, startMonth: "2026-01", isGroup, sources: ["sub"],
  }).returning())[0];
}
const readGoal = async (id: string) => (await database.select().from(S.goals).where(eq(S.goals.id, id)))[0];

describe("edição dos detalhes das metas", () => {
  it("edita sem recriar, preserva início, saldo, fontes e data de criação e recalcula só o esforço restante", async () => {
    const goal = await fixture();
    const edited = await updateGoal(connection, owner, goal.id, valid, today);
    expect(edited).toEqual({ ...goal, name: "Notebook novo", icon: "laptop_mac", target: 3500.29, months: 13 });
    expect(await readGoal(goal.id)).toEqual(edited);
    expect(goalUntil(edited)).toEqual(new Date(2027, 0, 1));
    expect(goalView(edited, [], today).monthly).toBeCloseTo((3500.29 - 500.25) / 4);
    expect(await database.select().from(S.accounts)).toHaveLength(0);
    expect(await database.select().from(S.transactions)).toHaveLength(0);
  });

  it("aceita o mês atual e mantém o saldo ao reduzir o objetivo abaixo do guardado", async () => {
    const goal = await fixture();
    const edited = await updateGoal(connection, owner, goal.id, { target: 100, deadline: "2026-10" }, today);
    expect(edited).toMatchObject({ saved: 500.25, months: 10, startMonth: "2026-01" });
    expect(goalView(edited, [], today).monthly).toBe(0);
  });

  it("preserva todos os saldos de participantes e recalcula a divisão mensal", async () => {
    const goal = await fixture(true);
    await database.insert(S.goalMembers).values([
      { userId: owner.id, goalId: goal.id, name: "Você", saved: 100, income: 1000, isMe: true },
      { userId: owner.id, goalId: goal.id, name: "Outra pessoa", saved: 200, income: 2000 },
    ]);
    const members = await database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, goal.id));
    const edited = await updateGoal(connection, { ...owner, plan: "pilot" }, goal.id, { target: 1500, deadline: "2026-12" }, today);
    expect(edited.saved).toBe(goal.saved);
    expect(await database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, goal.id))).toEqual(members);
    const view = goalView(edited, members, today);
    expect(view.monthly).toBe(400);
    expect(groupShares(members, view.monthly, "igual").map((m) => m.share)).toEqual([200, 200]);
  });

  it("preserva a edição existente de divisão e privacidade", async () => {
    const goal = await fixture(true);
    await database.insert(S.goalMembers).values({ userId: owner.id, goalId: goal.id, name: "Você", saved: 100, isMe: true });
    const edited = await updateGoal(connection, { ...owner, plan: "pilot" }, goal.id, { splitMode: "igual", myPrivacy: "cats" }, today);
    expect(edited).toEqual({ ...goal, splitMode: "igual", myPrivacy: "cats" });
    const [member] = await database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, goal.id));
    expect(member).toMatchObject({ privacy: "cats", saved: 100 });
  });

  it("bloqueia outro usuário e metas inexistentes sem alterar os dados", async () => {
    const goal = await fixture();
    await expect(updateGoal(connection, { id: "edit-other", plan: "pilot" }, goal.id, valid, today)).rejects.toMatchObject({ status: 404 });
    await expect(updateGoal(connection, owner, "missing", valid, today)).rejects.toMatchObject({ status: 404 });
    expect(await readGoal(goal.id)).toEqual(goal);
  });

  it("respeita Plus para metas individuais e Pilot para metas de grupo ou privacidade", async () => {
    const goal = await fixture();
    const group = await fixture(true);
    for (const [user, id, body] of [
      [{ ...owner, plan: "gratis" }, goal.id, valid],
      [owner, group.id, valid],
      [owner, goal.id, { myPrivacy: "cats" }],
    ] as const) {
      await expect(updateGoal(connection, user, id, body, today)).rejects.toMatchObject({ status: 402 });
    }
    expect(await readGoal(group.id)).toEqual(group);
  });

  it.each(["2025-12", "2026-09", "2036-01"])("rejeita prazo fora dos limites (%s) sem gravação parcial", async (deadline) => {
    const goal = await fixture();
    await expect(updateGoal(connection, owner, goal.id, { ...valid, deadline }, today)).rejects.toMatchObject({ status: 400 });
    expect(await readGoal(goal.id)).toEqual(goal);
  });

  it("permite apenas renomear uma meta vencida, sem obrigar a mudar o prazo", async () => {
    const goal = await fixture();
    const edited = await updateGoal(connection, owner, goal.id, { name: "Outro nome" }, new Date(2028, 0, 1));
    expect(edited).toEqual({ ...goal, name: "Outro nome" });
  });

  it("não perde aportes concorrentes durante a edição", async () => {
    const goal = await fixture();
    await Promise.all([
      updateGoal(connection, owner, goal.id, valid, today),
      recordGoalContribution(connection, owner, goal.id, 100.15),
    ]);
    expect(await readGoal(goal.id)).toMatchObject({ name: "Notebook novo", saved: 600.4, months: 13 });
  });

  it("conta início e prazo inclusivos e não conta meses anteriores ao início", async () => {
    const goal = await fixture();
    const future = { ...goal, startMonth: "2027-01", months: 3, target: 300, saved: 0 };
    expect(goalView(future, [], today).monthly).toBe(100);
    expect(goalCalc(300, 3, [], [], undefined, today).until).toEqual(new Date(2026, 11, 1));
  });
});

describe("validação do PATCH de metas", () => {
  it.each([
    {}, { name: "" }, { name: " " }, { name: "x".repeat(61) }, { icon: "" }, { icon: "<bad>" },
    { target: 0 }, { target: -1 }, { target: 10_000_001 }, { target: 1.001 }, { target: NaN },
    { target: Infinity }, { target: "100" }, { deadline: "2026-13" }, { deadline: "2026-1" },
    { saved: 0 }, { startMonth: "2026-10" }, { months: 10 }, { userId: "other" },
    { splitMode: "outro" }, { myPrivacy: "public" }, { isGroup: true },
  ])("rejeita entrada inválida ou campo protegido: %j", (body) => {
    expect(goalPatchInput.safeParse(body).success).toBe(false);
  });

  it.each([0.01, 0.29, 3500.29, 10_000_000])("aceita objetivo com centavos válidos: %s", (target) => {
    expect(goalPatchInput.safeParse({ target }).success).toBe(true);
  });
});
