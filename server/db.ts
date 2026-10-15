// No Replit, Publish sincroniza o schema de desenvolvimento com o de produção.
// Não executar DDL na subida do Postgres. PGlite e suas migrações são só para uso local.
import path from "path";
import fs from "fs";
import * as schema from "@shared/schema";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

export type DB = NeonDatabase<typeof schema>;

const migrationsFolder = path.resolve(import.meta.dirname, "..", "migrations");

async function connect(): Promise<{ db: DB; kind: "postgres" | "pglite" }> {
  if (process.env.DATABASE_URL) {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const ws = (await import("ws")).default;
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });
    return { db, kind: "postgres" };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL é obrigatório em produção; PGlite é apenas para desenvolvimento local.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR || path.resolve(import.meta.dirname, "..", ".data", "pglite");
  if (dir !== "memory://") fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  return { db: db as unknown as DB, kind: "pglite" };
}

let instance: DB | null = null;
export let dbKind: "postgres" | "pglite" = "pglite";

export async function initDb(): Promise<DB> {
  if (instance) return instance;
  const c = await connect();
  instance = c.db;
  dbKind = c.kind;
  return instance;
}

/** Banco já inicializado (initDb roda na subida do servidor). */
export function db(): DB {
  if (!instance) throw new Error("Banco ainda não inicializado");
  return instance;
}
