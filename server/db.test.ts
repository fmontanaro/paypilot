import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  drizzle: vi.fn(() => ({ connected: true })),
  migrate: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  Pool: class Pool {},
  neonConfig: {},
}));
vi.mock("drizzle-orm/neon-serverless", () => ({ drizzle: mocks.drizzle }));
vi.mock("drizzle-orm/neon-serverless/migrator", () => ({ migrate: mocks.migrate }));
vi.mock("ws", () => ({ default: class WebSocket {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("inicialização segura do banco", () => {
  it("conecta ao Postgres sem executar migrações na subida", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test.invalid/test");
    vi.stubEnv("NODE_ENV", "production");
    const { initDb } = await import("./db");
    await initDb();
    expect(mocks.drizzle).toHaveBeenCalledOnce();
    expect(mocks.migrate).not.toHaveBeenCalled();
  });

  it("não usa banco local descartável em produção sem DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const { initDb } = await import("./db");
    await expect(initDb()).rejects.toThrow("DATABASE_URL é obrigatório em produção");
    expect(mocks.drizzle).not.toHaveBeenCalled();
  });
});
