import { and, eq } from "drizzle-orm";
import * as S from "@shared/schema";
import type { DB } from "../db";

export const REAL_OPEN_FINANCE_UNAVAILABLE =
  "Open Finance real ainda não está configurado. Nenhuma autorização será solicitada ao banco. Importe um extrato OFX ou CSV para usar seus dados reais.";

export function canUseSandbox(user: Pick<S.User, "isDemo">): boolean {
  return user.isDemo;
}

/** Desconecta somente o simulador local. Não representa revogação em um banco real. */
export async function disconnectSandboxConnection(database: DB, userId: string, connectionId: string) {
  return database.transaction(async (tx) => {
    const [connection] = await tx
      .select()
      .from(S.connections)
      .where(and(eq(S.connections.id, connectionId), eq(S.connections.userId, userId)))
      .for("update");
    if (!connection) return false;
    if (connection.provider !== "sandbox") throw new Error("A revogação deste provedor não está implementada.");
    // Preservar o histórico e identificá-lo como simulado, nunca como um arquivo real.
    await tx.update(S.accounts).set({ connectionId: null, source: "simulacao" })
      .where(and(eq(S.accounts.connectionId, connectionId), eq(S.accounts.userId, userId)));
    await tx.delete(S.connections)
      .where(and(eq(S.connections.id, connectionId), eq(S.connections.userId, userId)));
    return true;
  });
}
