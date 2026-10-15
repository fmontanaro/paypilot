import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as S from "@shared/schema";
import type { DB } from "../db";
import { canUseSandbox, disconnectSandboxConnection } from "./disconnect";

const client = new PGlite("memory://");
const database = drizzle({ client, schema: S });
const connectionDb = database as unknown as DB;

beforeAll(async () => {
  await migrate(database, { migrationsFolder: path.resolve(import.meta.dirname, "../../migrations") });
  await database.insert(S.users).values([{ id: "owner", name: "Teste" }, { id: "other", name: "Outro" }]);
}, 15000);
afterAll(async () => { await client.close(); });

async function fixture(provider = "sandbox") {
  const [connection] = await database.insert(S.connections).values({
    userId: "owner", provider, institution: "Instituição de teste",
    consentExpiresAt: new Date("2027-01-01"),
  }).returning();
  const [account] = await database.insert(S.accounts).values({
    userId: "owner", connectionId: connection.id, institution: "Teste",
    name: "Histórico", kind: "conta", source: "open_finance", creditLimit: 500,
  }).returning();
  const [transaction] = await database.insert(S.transactions).values({
    userId: "owner", accountId: account.id, date: "2026-10-01",
    description: "Lançamento preservado", amount: 50, fingerprint: connection.id,
  }).returning();
  return { connection, account, transaction };
}

describe("desconectar uma simulação", () => {
  it("remove o vínculo, mas preserva contas, saldos e lançamentos", async () => {
    const f = await fixture();
    expect(await disconnectSandboxConnection(connectionDb, "owner", f.connection.id)).toBe(true);
    expect(await database.select().from(S.connections).where(eq(S.connections.id, f.connection.id))).toHaveLength(0);
    const [account] = await database.select().from(S.accounts).where(eq(S.accounts.id, f.account.id));
    expect(account).toMatchObject({ connectionId: null, source: "simulacao", creditLimit: 500 });
    const [transaction] = await database.select().from(S.transactions).where(eq(S.transactions.id, f.transaction.id));
    expect(transaction).toMatchObject({ accountId: f.account.id, amount: 50 });
    expect(await disconnectSandboxConnection(connectionDb, "owner", f.connection.id)).toBe(false);
  });

  it("não permite desconectar a instituição de outro usuário", async () => {
    const f = await fixture();
    expect(await disconnectSandboxConnection(connectionDb, "other", f.connection.id)).toBe(false);
    const [account] = await database.select().from(S.accounts).where(eq(S.accounts.id, f.account.id));
    expect(account.connectionId).toBe(f.connection.id);
    expect(await database.select().from(S.connections).where(eq(S.connections.id, f.connection.id))).toHaveLength(1);
  });

  it("não finge revogar uma conexão de provedor não implementado", async () => {
    const f = await fixture("real-provider");
    await expect(disconnectSandboxConnection(connectionDb, "owner", f.connection.id)).rejects.toThrow("revogação");
    const [account] = await database.select().from(S.accounts).where(eq(S.accounts.id, f.account.id));
    expect(account.connectionId).toBe(f.connection.id);
  });
});

describe("acesso ao simulador", () => {
  it("bloqueia simulações para contas reais", () => {
    expect(canUseSandbox({ isDemo: false })).toBe(false);
  });
  it("permite simulações somente em contas de demonstração", () => {
    expect(canUseSandbox({ isDemo: true })).toBe(true);
  });
});
