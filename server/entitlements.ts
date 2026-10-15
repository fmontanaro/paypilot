import type { User } from "@shared/schema";

/**
 * Acesso de cortesia concedido pelo dono do projeto a contas existentes.
 * A configuração é exclusiva do servidor e usa IDs, nunca parâmetros da requisição.
 */
export function applyComplimentaryPlan(
  user: User,
  configuredIds = process.env.COMPLIMENTARY_PILOT_USER_IDS || "",
): User {
  const ids = configuredIds.split(",").map((id) => id.trim()).filter(Boolean);
  return ids.includes(user.id) ? { ...user, plan: "pilot" } : user;
}
