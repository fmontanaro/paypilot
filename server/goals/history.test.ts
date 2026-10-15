import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as S from "@shared/schema";
import { goalView } from "@shared/engine/goals";
import type { DB } from "../db";
import { contributionRequest, listGoalContributions, recordGoalContribution, reversalInput, reverseGoalContribution } from "./contributions";

const client = new PGlite("memory://");
const database = drizzle({ client, schema: S });
const db = database as unknown as DB;
const owner = { id: "history-owner", name: "Pessoa", plan: "pilot" };
const other = { id: "history-other", name: "Outra", plan: "pilot" };
const migrationsFolder = path.resolve(import.meta.dirname, "../../migrations");
beforeAll(async () => {
  await migrate(database, { migrationsFolder });
  await database.insert(S.users).values([owner, other]);
}, 15000);
afterAll(async () => { await client.close(); });
async function fixture(saved = 0, isGroup = false) {
  const [goal] = await database.insert(S.goals).values({
    userId: owner.id, name: "Reserva", target: 2000, saved, isGroup, months: 12, startMonth: "2026-10",
  }).returning();
  return goal;
}
const read = (id: string) => listGoalContributions(db, owner, id);
const reverse = (goalId: string, entryId: string, replacementAmount?: number, idempotencyKey = randomUUID()) =>
  reverseGoalContribution(db, owner, goalId, entryId, { confirmed: true, reason: "Valor incorreto", replacementAmount, idempotencyKey });
const freshGoal = async (id: string) => (await database.select().from(S.goals).where(eq(S.goals.id, id)))[0];
const memberRows = (id: string) => database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, id));

describe("histórico auditável das metas", () => {
  it("preserva saldo inicial, inclusive zero, sem duplicá-lo em consultas simultâneas", async () => {
    for (const saved of [0, 1234.56]) {
      const goal = await fixture(saved);
      const histories = await Promise.all([read(goal.id), read(goal.id)]);
      expect(histories[0].entries).toHaveLength(1);
      expect(histories[1].entries).toHaveLength(1);
      expect(histories[0].entries[0]).toMatchObject({ kind: "initial", amount: saved, actorName: null, canCorrect: true });
      expect((await freshGoal(goal.id)).saved).toBe(saved);
    }
  });

  it("registra autoria e data, evita reenvio e recusa reutilizar chave com outro valor", async () => {
    const goal = await fixture(12.34);
    const key = randomUUID();
    await Promise.all([
      recordGoalContribution(db, owner, goal.id, 0.1, key),
      recordGoalContribution(db, owner, goal.id, 0.1, key),
    ]);
    await expect(recordGoalContribution(db, owner, goal.id, 0.2, key)).rejects.toMatchObject({ status: 409 });
    const history = await read(goal.id);
    expect(history.saved).toBe(12.44);
    expect(history.entries).toHaveLength(2);
    expect(history.entries.find((e) => e.kind === "contribution")).toMatchObject({
      amount: 0.1, actorName: owner.name, participantName: owner.name, createdAt: expect.any(Date),
    });
  });

  it("corrige mantendo o original, o estorno e o substituto, e permite corrigir o substituto", async () => {
    const goal = await fixture(100.01);
    const original = (await read(goal.id)).entries[0];
    const key = randomUUID();
    await reverse(goal.id, original.id, 20.02, key);
    await reverse(goal.id, original.id, 20.02, key);
    let history = await read(goal.id);
    expect(history.saved).toBe(20.02);
    expect(history.entries).toHaveLength(3);
    expect(history.entries.find((e) => e.id === original.id)).toMatchObject({ amount: 100.01, reversed: true, canCorrect: false });
    expect(history.entries.find((e) => e.kind === "correction")).toMatchObject({
      amount: -100.01, reversesId: original.id, actorName: owner.name, reason: "Valor incorreto",
    });
    const replacement = history.entries.find((e) => e.kind === "contribution")!;
    await reverse(goal.id, replacement.id, 0.01);
    history = await read(goal.id);
    expect(history.saved).toBe(0.01);
    expect(history.entries.reduce((total, e) => total + Math.round(e.amount * 100), 0)).toBe(1);
  });

  it("estorna uma única vez mesmo com duas confirmações concorrentes", async () => {
    const goal = await fixture();
    await recordGoalContribution(db, owner, goal.id, 0.3);
    const entry = (await read(goal.id)).entries.find((e) => e.kind === "contribution")!;
    const outcomes = await Promise.allSettled([reverse(goal.id, entry.id), reverse(goal.id, entry.id)]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await read(goal.id)).saved).toBe(0);
    expect((await read(goal.id)).entries.filter((e) => e.kind === "reversal")).toHaveLength(1);
    expect(await database.select().from(S.accounts)).toHaveLength(0);
    expect(await database.select().from(S.transactions)).toHaveLength(0);
  });

  it("preserva participações e só permite corrigir o próprio saldo inicial e registros", async () => {
    const goal = await fixture(300.03, true);
    await database.insert(S.goalMembers).values([
      { userId: owner.id, goalId: goal.id, name: "Eu", isMe: true, saved: 100.01 },
      { userId: owner.id, goalId: goal.id, name: "Participante", isMe: false, saved: 200.02 },
    ]);
    let history = await read(goal.id);
    const mine = history.entries.find((e) => e.participantName === "Eu")!;
    const theirs = history.entries.find((e) => e.participantName === "Participante")!;
    expect(theirs.canCorrect).toBe(false);
    await expect(reverse(goal.id, theirs.id, 1)).rejects.toMatchObject({ status: 403 });
    await reverse(goal.id, mine.id, 50.05);
    await recordGoalContribution(db, owner, goal.id, 0.1);
    history = await read(goal.id);
    const members = await memberRows(goal.id);
    expect(members.find((m) => m.isMe)?.saved).toBe(50.15);
    expect(members.find((m) => !m.isMe)?.saved).toBe(200.02);
    expect(history.saved).toBe(250.17);
    expect(goalView(await freshGoal(goal.id), members, new Date()).saved).toBe(250.17);
    expect(history.entries.reduce((sum, e) => sum + Math.round(e.amount * 100), 0)).toBe(25017);
  });

  it("não descarta saldo legado sem participantes nem divergências legadas do total", async () => {
    const empty = await fixture(300.01, true);
    const initial = (await read(empty.id)).entries[0];
    expect(initial).toMatchObject({ amount: 300.01, canCorrect: false, actorName: null });
    expect(await memberRows(empty.id)).toHaveLength(0);
    await expect(reverse(empty.id, initial.id)).rejects.toMatchObject({ status: 403 });
    await expect(reverse(empty.id, initial.id, 1)).rejects.toMatchObject({ status: 403 });
    expect((await read(empty.id)).saved).toBe(300.01);
    await recordGoalContribution(db, owner, empty.id, 0.1);
    expect((await memberRows(empty.id))[0].saved).toBe(0.1);
    const ownEntry = (await read(empty.id)).entries.find((entry) => entry.kind === "contribution")!;
    expect(ownEntry.canCorrect).toBe(true);
    await reverse(empty.id, ownEntry.id);
    expect((await read(empty.id)).saved).toBe(300.01);
    expect((await memberRows(empty.id))[0].saved).toBe(0);
    const mismatch = await fixture(310, true);
    await database.insert(S.goalMembers).values({
      userId: owner.id, goalId: mismatch.id, name: "Outra", saved: 200,
    });
    const history = await read(mismatch.id);
    expect(history.entries.map((e) => e.amount).sort()).toEqual([110, 200]);
    expect(history.entries.every((e) => !e.canCorrect)).toBe(true);
    await recordGoalContribution(db, owner, mismatch.id, 10);
    expect((await freshGoal(mismatch.id)).saved).toBe(320);
    expect((await memberRows(mismatch.id)).find((m) => m.isMe)?.saved).toBe(10);
    expect(goalView(await freshGoal(mismatch.id), await memberRows(mismatch.id), new Date()).saved).toBe(320);
  });

  it("exige plano, proprietário, meta e registro corretos para consulta e correção", async () => {
    const goal = await fixture(10);
    const entry = (await read(goal.id)).entries[0];
    await expect(listGoalContributions(db, other, goal.id)).rejects.toMatchObject({ status: 404 });
    await expect(reverseGoalContribution(db, other, goal.id, entry.id, {
      confirmed: true, reason: "Teste", idempotencyKey: randomUUID(),
    })).rejects.toMatchObject({ status: 404 });
    await expect(listGoalContributions(db, { ...owner, plan: "gratis" }, goal.id)).rejects.toMatchObject({ status: 402 });
    const group = await fixture(10, true);
    await expect(listGoalContributions(db, { ...owner, plan: "plus" }, group.id)).rejects.toMatchObject({ status: 402 });
    await expect(reverse(group.id, entry.id)).rejects.toMatchObject({ status: 404 });
    await expect(reverse(goal.id, "missing")).rejects.toMatchObject({ status: 404 });
    expect((await read(goal.id)).saved).toBe(10);
  });

  it("faz rollback completo quando o limite é excedido, sem saldo inicial parcial", async () => {
    const goal = await fixture(999_999_999_999.99);
    await expect(recordGoalContribution(db, owner, goal.id, 0.01)).rejects.toMatchObject({ status: 400 });
    expect(await database.select().from(S.goalContributions).where(eq(S.goalContributions.goalId, goal.id))).toHaveLength(0);
    expect((await freshGoal(goal.id)).saved).toBe(999_999_999_999.99);
  });

  it("recusa chave reutilizada para outra operação e não permite estornar o estorno", async () => {
    const goal = await fixture(10);
    const key = randomUUID();
    await recordGoalContribution(db, owner, goal.id, 1, key);
    const original = (await read(goal.id)).entries.find((e) => e.kind === "contribution")!;
    await expect(reverse(goal.id, original.id, undefined, key)).rejects.toMatchObject({ status: 409 });
    await reverse(goal.id, original.id);
    const reversal = (await read(goal.id)).entries.find((e) => e.kind === "reversal")!;
    await expect(reverse(goal.id, reversal.id)).rejects.toMatchObject({ status: 403 });
  });

  it("exige confirmação, motivo, centavos e chave válida", () => {
    const valid = { confirmed: true, reason: "Duplicado", idempotencyKey: randomUUID() };
    expect(reversalInput.safeParse(valid).success).toBe(true);
    for (const body of [
      { ...valid, confirmed: false }, { ...valid, reason: " " },
      { ...valid, replacementAmount: 0 }, { ...valid, replacementAmount: 1.001 },
      { ...valid, replacementAmount: -1 }, { ...valid, amount: 1 },
      { ...valid, idempotencyKey: "" }, { ...valid, memberId: "other" },
    ]) expect(reversalInput.safeParse(body).success).toBe(false);
    expect(contributionRequest.safeParse({ amount: 1 }).success).toBe(false);
  });
});

it("persiste histórico, correção e chaves após fechar e reabrir o banco", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "paypilot-history-"));
  let disk = new PGlite(dir);
  try {
    let persistent = drizzle({ client: disk, schema: S });
    await migrate(persistent, { migrationsFolder });
    await persistent.insert(S.users).values(owner);
    const [goal] = await persistent.insert(S.goals).values({
      userId: owner.id, name: "Persistente", target: 1000, saved: 100.01, months: 12, startMonth: "2026-10",
    }).returning();
    const key = randomUUID();
    await recordGoalContribution(persistent as unknown as DB, owner, goal.id, 0.2, key);
    const original = (await listGoalContributions(persistent as unknown as DB, owner, goal.id)).entries.find((e) => e.kind === "contribution")!;
    const correctionKey = randomUUID();
    const body = { confirmed: true, reason: "Correção persistente", idempotencyKey: correctionKey, replacementAmount: 0.1 };
    await reverseGoalContribution(persistent as unknown as DB, owner, goal.id, original.id, body);
    await disk.close();
    disk = new PGlite(dir);
    persistent = drizzle({ client: disk, schema: S });
    await recordGoalContribution(persistent as unknown as DB, owner, goal.id, 0.2, key);
    await reverseGoalContribution(persistent as unknown as DB, owner, goal.id, original.id, body);
    const history = await listGoalContributions(persistent as unknown as DB, owner, goal.id);
    expect(history.saved).toBe(100.11);
    expect(history.entries).toHaveLength(4);
  } finally {
    await disk.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 20000);
