import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Server } from "node:http";
import express from "express";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as S from "@shared/schema";
import type { DB } from "../db";
import { setupSession, registerAuthRoutes } from "../auth";
import { registerRoutes } from "../routes";

const holder = vi.hoisted(() => ({ database: undefined as unknown as DB }));
vi.mock("../db", () => ({ db: () => holder.database }));
const client = new PGlite("memory://");
const database = drizzle({ client, schema: S });
let server: Server;
let base: string;
type Account = { id: string; cookie: string; email: string };
let owner: Account, guest: Account, stranger: Account;
async function request(account: Account | null, method: string, url: string, body?: unknown) {
  const response = await fetch(base + url, {
    method, headers: { "Content-Type": "application/json", ...(account ? { Cookie: account.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
}
async function signup(email: string, name: string): Promise<Account> {
  const result = await request(null, "POST", "/api/auth/signup", { ident: email, name, password: "test-only-password" });
  expect(result.status).toBe(201);
  return { id: result.body.id, cookie: result.cookie, email };
}
async function goal(isGroup = false, saved = 0) {
  const [row] = await database.insert(S.goals).values({
    userId: owner.id, name: "Viagem compartilhada", target: 2000, saved, months: 12,
    startMonth: "2026-10", isGroup, sources: ["corte privado"],
  }).returning();
  return row;
}
async function invite(goalId: string, contact = guest.email) {
  const result = await request(owner, "POST", `/api/goals/${goalId}/invites`, { contact });
  expect(result.status).toBe(201);
  expect(result.body).not.toHaveProperty("tokenHash");
  return result.body as { token: string; id: string };
}
beforeAll(async () => {
  await migrate(database, { migrationsFolder: path.resolve(import.meta.dirname, "../../migrations") });
  holder.database = database as unknown as DB;
  const app = express();
  app.use(express.json());
  setupSession(app);
  registerAuthRoutes(app);
  registerRoutes(app);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  base = `http://127.0.0.1:${address.port}`;
  owner = await signup("owner@example.test", "Proprietário");
  guest = await signup("guest@example.test", "Convidada");
  stranger = await signup("stranger@example.test", "Outra pessoa");
  await database.update(S.users).set({ plan: "pilot" }).where(eq(S.users.id, owner.id));
}, 20000);
afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  await client.close();
});

describe("convite e participação com contas e sessões reais", () => {
  it("exige sessão, código e contato correto, sem dar acesso antes do aceite", async () => {
    const g = await goal(false, 100);
    const i = await invite(g.id, " GUEST@EXAMPLE.TEST ");
    expect((await request(null, "POST", "/api/goal-invites/accept", { token: i.token })).status).toBe(401);
    expect((await request(stranger, "POST", "/api/goal-invites/accept", { token: i.token })).status).toBe(404);
    expect((await request(guest, "GET", `/api/goals/${g.id}/contributions`)).status).toBe(404);
    expect((await request(guest, "POST", "/api/goal-invites/accept", { token: "a".repeat(64) })).status).toBe(404);
    expect((await request(guest, "POST", "/api/goal-invites/accept", { token: i.token, accountId: owner.id })).status).toBe(400);
    const accepts = await Promise.all([1, 2].map(() => request(guest, "POST", "/api/goal-invites/accept", { token: i.token })));
    expect(accepts.map((r) => r.status)).toEqual([200, 200]);
    const members = await database.select().from(S.goalMembers).where(eq(S.goalMembers.goalId, g.id));
    expect(members.filter((m) => m.accountId === guest.id)).toHaveLength(1);
    expect(members.find((m) => m.accountId === guest.id)?.saved).toBe(0);
    const history = await request(owner, "GET", `/api/goals/${g.id}/contributions`);
    expect(history.body.saved).toBe(100);
    expect(history.body.entries[0]).toMatchObject({ participantName: "Proprietário", canCorrect: true });
    expect((await request(guest, "GET", `/api/goals/${g.id}/contributions`)).body.entries[0].canCorrect).toBe(false);
    const key = randomUUID();
    const posted = await request(guest, "POST", `/api/goals/${g.id}/contributions`, { amount: 25.25, idempotencyKey: key });
    expect(posted).toMatchObject({ status: 201, body: { saved: 125.25, amount: 25.25 } });
    expect(posted.body).not.toHaveProperty("goal");
    expect((await request(guest, "POST", `/api/goals/${g.id}/contributions`, { amount: 25.25, idempotencyKey: key })).body.saved).toBe(125.25);
    expect((await request(owner, "POST", `/api/goals/${g.id}/contributions`, { amount: 25.25, idempotencyKey: key })).status).toBe(409);
  });

  it("cada conta corrige apenas seus registros, mantendo o total e a autoria", async () => {
    const g = await goal();
    const i = await invite(g.id);
    await request(guest, "POST", "/api/goal-invites/accept", { token: i.token });
    await Promise.all([owner, guest].map((account) => request(account, "POST", `/api/goals/${g.id}/contributions`, { amount: 10.1, idempotencyKey: randomUUID() })));
    const ownHistory = await request(owner, "GET", `/api/goals/${g.id}/contributions`);
    const guestHistory = await request(guest, "GET", `/api/goals/${g.id}/contributions`);
    expect(ownHistory.body.saved).toBe(20.2);
    const ownEntry = ownHistory.body.entries.find((e: any) => e.kind === "contribution" && e.canCorrect);
    const guestEntry = guestHistory.body.entries.find((e: any) => e.kind === "contribution" && e.canCorrect);
    const correction = { confirmed: true, reason: "Motivo privado da pessoa", replacementAmount: 5.05, idempotencyKey: randomUUID() };
    expect((await request(owner, "POST", `/api/goals/${g.id}/contributions/${guestEntry.id}/reverse`, correction)).status).toBe(403);
    expect((await request(guest, "POST", `/api/goals/${g.id}/contributions/${ownEntry.id}/reverse`, correction)).status).toBe(403);
    expect((await request(guest, "POST", `/api/goals/${g.id}/contributions/${guestEntry.id}/reverse`, correction))).toMatchObject({ status: 200, body: { saved: 15.15 } });
    const after = await request(owner, "GET", `/api/goals/${g.id}/contributions`);
    expect(after.body.entries.find((e: any) => e.reversesId === guestEntry.id).reason).toBeNull();
    expect((await request(guest, "PATCH", `/api/goals/${g.id}`, { name: "Não permitido" })).status).toBe(402);
    await database.update(S.users).set({ plan: "pilot" }).where(eq(S.users.id, guest.id));
    expect((await request(guest, "PATCH", `/api/goals/${g.id}`, { name: "Não permitido" })).status).toBe(404);
    expect((await request(guest, "POST", `/api/goals/${g.id}/invites`, { contact: stranger.email })).status).toBe(404);
    await database.update(S.users).set({ plan: "gratis" }).where(eq(S.users.id, guest.id));
    expect(await database.select().from(S.accounts)).toHaveLength(0);
    expect(await database.select().from(S.transactions)).toHaveLength(0);
    const [member] = await database.select().from(S.goalMembers).where(and(eq(S.goalMembers.goalId, g.id), eq(S.goalMembers.accountId, guest.id)));
    expect(member.saved).toBe(5.05);
  });

  it("snapshot e exportação não vazam dados privados e sobrevivem a novo login", async () => {
    const g = await goal();
    const i = await invite(g.id);
    await request(guest, "POST", "/api/goal-invites/accept", { token: i.token });
    await database.insert(S.incomes).values({ userId: owner.id, name: "Renda secreta", amount: 9999, payDay: 5 });
    await database.update(S.goalMembers).set({ income: 9999, privacy: "cats" }).where(eq(S.goalMembers.goalId, g.id));
    await request(guest, "POST", "/api/goals/" + g.id + "/contributions", { amount: 7, idempotencyKey: randomUUID() });
    const ownerSnapshot = (await request(owner, "GET", "/api/snapshot")).body;
    expect(ownerSnapshot.goalInvites.every((i: any) => i.tokenHash === null && i.acceptedBy === null)).toBe(true);
    expect(ownerSnapshot.goalMembers.every((m: any) => m.income === null)).toBe(true);
    await request(guest, "POST", "/api/auth/logout");
    const login = await request(null, "POST", "/api/auth/login", { ident: guest.email, password: "test-only-password" });
    expect(login.status).toBe(200);
    guest.cookie = login.cookie;
    const snapshot = (await request(guest, "GET", "/api/snapshot")).body;
    expect(snapshot.incomes).toHaveLength(0);
    expect(snapshot.accounts).toHaveLength(0);
    expect(snapshot.transactions).toHaveLength(0);
    expect(snapshot.goalInvites).toHaveLength(0);
    expect(snapshot.goals.find((goal: any) => goal.id === g.id).sources).toEqual([]);
    const members = snapshot.goalMembers.filter((m: any) => m.goalId === g.id);
    expect(members.every((m: any) => m.income === null && m.privacy === "contrib")).toBe(true);
    expect(members.find((m: any) => m.isMe).accountId).toBe(guest.id);
    expect(members.find((m: any) => !m.isMe).accountId).toBeNull();
    expect((await request(stranger, "GET", "/api/snapshot")).body.goals).toHaveLength(0);
    const exported = (await request(guest, "GET", "/api/me/export")).body;
    expect(exported.goalContributions.every((e: any) => e.actorId === guest.id)).toBe(true);
    expect(exported.goalContributions.some((e: any) => e.goalId === g.id && e.amount === 7)).toBe(true);
  });

  it("rejeita convite expirado ou legado sem código e não associa saldo legado a convidado", async () => {
    const g = await goal(true, 60);
    await database.insert(S.goalMembers).values({ userId: owner.id, goalId: g.id, name: "Convidada", saved: 60, income: 3000 });
    const i = await invite(g.id);
    await database.update(S.goalInvites).set({ expiresAt: new Date(0) }).where(eq(S.goalInvites.id, i.id));
    expect((await request(guest, "POST", "/api/goal-invites/accept", { token: i.token })).status).toBe(404);
    const fresh = await invite(g.id);
    expect((await request(guest, "POST", "/api/goal-invites/accept", { token: fresh.token })).status).toBe(200);
    const history = (await request(guest, "GET", `/api/goals/${g.id}/contributions`)).body;
    expect(history.saved).toBe(60);
    expect(history.entries.filter((e: any) => e.amount !== 0).every((e: any) => !e.canCorrect)).toBe(true);
    const members = (await request(guest, "GET", "/api/snapshot")).body.goalMembers.filter((m: any) => m.goalId === g.id);
    expect(members.find((m: any) => m.isMe).saved).toBe(0);
  });
});
