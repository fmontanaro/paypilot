import type { Goal } from "@shared/schema";

export type GoalEditDraft = { name: string; icon: string; target: string; deadline: string };
export type GoalEditPayload = { name: string; icon: string; target: number; deadline?: string };

export function createGoalEditDraft(goal: Pick<Goal, "name" | "icon" | "target" | "months" | "startMonth">): GoalEditDraft {
  const [year, month] = goal.startMonth.split("-").map(Number);
  const until = new Date(year, month - 1 + goal.months - 1, 1);
  return {
    name: goal.name,
    icon: goal.icon,
    target: goal.target.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    deadline: `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, "0")}`,
  };
}

export function parseGoalTarget(value: string): number | null {
  const raw = value.trim().replace(/^R\$\s*/i, "");
  if (!raw) return null;
  let normalized: string;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw)) normalized = raw.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(?:,\d{1,2})?$/.test(raw)) normalized = raw.replace(",", ".");
  else if (/^\d+\.\d{1,2}$/.test(raw)) normalized = raw;
  else return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0.01 && amount <= 10_000_000 && Math.abs(Math.round(amount * 100) - amount * 100) < 0.000001 ? amount : null;
}

export function validateGoalEdit(draft: GoalEditDraft, startMonth: string, currentMonth: string, originalDeadline?: string): { payload: GoalEditPayload | null; errors: Partial<Record<keyof GoalEditDraft, string>> } {
  const errors: Partial<Record<keyof GoalEditDraft, string>> = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Informe o nome da meta.";
  else if (name.length > 60) errors.name = "Use até 60 caracteres.";
  const icon = draft.icon.trim();
  if (!icon) errors.icon = "Escolha um ícone.";
  else if (icon.length > 40 || !/^[a-z0-9_]+$/.test(icon)) errors.icon = "Este ícone não é válido.";
  const target = parseGoalTarget(draft.target);
  if (target === null) errors.target = "Informe um valor entre R$ 0,01 e R$ 10.000.000,00, com até 2 casas decimais.";
  const deadlineChanged = draft.deadline !== originalDeadline;
  if (deadlineChanged) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.deadline)) errors.deadline = "Escolha um mês válido.";
    else if (draft.deadline < currentMonth) errors.deadline = "O prazo não pode ser anterior ao mês atual.";
    else if (draft.deadline < startMonth) errors.deadline = "O prazo não pode ser anterior ao início da meta.";
    else {
      const [sy, sm] = startMonth.split("-").map(Number);
      const [dy, dm] = draft.deadline.split("-").map(Number);
      const duration = (dy - sy) * 12 + dm - sm + 1;
      if (duration < 1 || duration > 120) errors.deadline = "O prazo deve totalizar de 1 a 120 meses desde o início da meta.";
    }
  }
  if (Object.keys(errors).length) return { payload: null, errors };
  return { payload: { name, icon, target: target!, ...(deadlineChanged ? { deadline: draft.deadline } : {}) }, errors };
}
