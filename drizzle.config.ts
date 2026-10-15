import { defineConfig } from "drizzle-kit";

// Gera o SQL em migrations/ a partir de shared/schema.ts (não precisa de banco).
// As migrações são aplicadas na subida do servidor (server/db.ts).
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
});
