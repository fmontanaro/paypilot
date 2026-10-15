import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Goal, GoalMember } from "@shared/schema";
import { goalView } from "@shared/engine";
import { brl, monthYear } from "@shared/format";
import { api, useAction } from "@/lib/api";
import { useApp } from "@/lib/app";
import { btnPrimary, btnSecondary, CloseBtn, I, input, labelCol, Sheet } from "@/ui";
import { createGoalEditDraft, parseGoalTarget, validateGoalEdit, type GoalEditDraft, type GoalEditPayload } from "./editDraft";

const ICONS = ["laptop_mac", "flight", "directions_car", "school", "home", "celebration", "medical_services", "savings"];

export function EditarMeta({
  goal, saved, members, today, currentMonth, availableIcons,
}: {
  goal: Goal;
  saved: number;
  members: GoalMember[];
  today: Date;
  currentMonth: string;
  availableIcons: string[];
}) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GoalEditDraft>(() => createGoalEditDraft(goal));
  const [attempted, setAttempted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const saveAction = useAction<GoalEditPayload>((payload) => api("PATCH", `/api/goals/${goal.id}`, payload));
  const originalDeadline = createGoalEditDraft(goal).deadline;
  const validation = validateGoalEdit(draft, goal.startMonth, currentMonth, originalDeadline);
  const options = [...new Set([...ICONS, ...availableIcons, goal.icon])];
  const fieldId = (field: string) => `goal-edit-${goal.id}-${field}`;

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = nameRef.current?.closest<HTMLElement>('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keepFocusInDialog);
    return () => window.removeEventListener("keydown", keepFocusInDialog);
  }, [open]);

  function openEditor() {
    saveAction.reset();
    setDraft(createGoalEditDraft(goal));
    setAttempted(false);
    setOpen(true);
  }

  function closeEditor() {
    if (saveAction.isPending || submittingRef.current) return;
    setOpen(false);
    setDraft(createGoalEditDraft(goal));
    setAttempted(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (saveAction.isPending || submittingRef.current) return;
    if (!validation.payload) {
      const firstInvalid = (["name", "target", "deadline"] as const).find((key) => validation.errors[key]);
      if (firstInvalid === "name") nameRef.current?.focus();
      else document.getElementById(fieldId(firstInvalid || "name"))?.focus();
      return;
    }
    submittingRef.current = true;
    try {
      await saveAction.mutateAsync(validation.payload);
      toast(`Meta “${validation.payload.name}” atualizada`);
      setOpen(false);
      setAttempted(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    } catch {
      // O erro da API fica visível no formulário para permitir corrigir ou tentar novamente.
    } finally {
      submittingRef.current = false;
    }
  }

  const showErrors = attempted;
  const draftDuration = /^\d{4}-(0[1-9]|1[0-2])$/.test(draft.deadline) ? durationFromStart(goal.startMonth, draft.deadline) : goal.months;
  const previewGoal = {
    ...goal,
    name: draft.name.trim() || goal.name,
    icon: draft.icon || goal.icon,
    target: parseGoalTarget(draft.target) ?? goal.target,
    months: draftDuration >= 1 && draftDuration <= 120 ? draftDuration : goal.months,
  };
  const preview = goalView(previewGoal, members, today);
  const fieldErrorStyle = (field: keyof GoalEditDraft) => showErrors && validation.errors[field] ? "var(--risk-t)" : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Editar meta ${goal.name}`}
        onClick={openEditor}
        style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink2)", fontWeight: 800 }}
      >
        Editar meta
      </button>
      <Sheet open={open} onClose={closeEditor} label={`Editar meta ${goal.name}`} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--accent-t)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>
                <I name="edit" size={17} />
                Ajuste sua meta
              </div>
              <h2 style={{ margin: "7px 0 0", fontSize: 22, lineHeight: 1.2 }}>Editar meta</h2>
            </div>
            <CloseBtn onClick={closeEditor} />
          </div>

          <div style={{ padding: 14, borderRadius: 16, background: "var(--brand-soft)", color: "var(--ink2)", fontSize: 14, lineHeight: 1.5 }}>
            O início da meta permanece em {monthYear(new Date(Number(goal.startMonth.slice(0, 4)), Number(goal.startMonth.slice(5, 7)) - 1, 1))}. O prazo inclui a contribuição do mês final.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: 14, borderRadius: 15, background: "var(--surface2)" }}>
              <div style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 700 }}>Já guardado</div>
              <div style={{ marginTop: 4, fontSize: 19, fontWeight: 900 }}>{brl(saved, true)}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 15, background: "var(--accent-soft)" }}>
              <div style={{ fontSize: 12, color: "var(--accent-t)", fontWeight: 700 }}>Com este prazo</div>
              <div style={{ marginTop: 4, fontSize: 19, fontWeight: 900, color: "var(--accent-t)" }}>{brl(preview.monthly, true)}/mês</div>
            </div>
          </div>

          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label htmlFor={fieldId("name")} style={labelCol}>
              Nome da meta
              <input
                ref={nameRef}
                id={fieldId("name")}
                value={draft.name}
                maxLength={80}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                aria-invalid={!!fieldErrorStyle("name")}
                aria-describedby={showErrors && validation.errors.name ? `${fieldId("name")}-error` : undefined}
                style={input(50, { fontSize: 16, fontWeight: 500, borderColor: fieldErrorStyle("name") })}
              />
              {showErrors && validation.errors.name && <span id={`${fieldId("name")}-error`} role="alert" style={errorStyle}>{validation.errors.name}</span>}
            </label>

            <label htmlFor={fieldId("target")} style={labelCol}>
              Valor objetivo
              <input
                id={fieldId("target")}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={draft.target}
                onChange={(event) => setDraft({ ...draft, target: event.target.value })}
                aria-invalid={!!fieldErrorStyle("target")}
                aria-describedby={showErrors && validation.errors.target ? `${fieldId("target")}-error` : undefined}
                style={input(50, { fontSize: 16, borderColor: fieldErrorStyle("target") })}
              />
              {showErrors && validation.errors.target && <span id={`${fieldId("target")}-error`} role="alert" style={errorStyle}>{validation.errors.target}</span>}
            </label>

            <label htmlFor={fieldId("deadline")} style={labelCol}>
              Mês final
              <input
                id={fieldId("deadline")}
                type="month"
                value={draft.deadline}
                min={originalDeadline < currentMonth ? originalDeadline : goal.startMonth > currentMonth ? goal.startMonth : currentMonth}
                onChange={(event) => setDraft({ ...draft, deadline: event.target.value })}
                aria-invalid={!!fieldErrorStyle("deadline")}
                aria-describedby={showErrors && validation.errors.deadline ? `${fieldId("deadline")}-error` : `${fieldId("deadline")}-hint`}
                style={input(50, { fontSize: 16, borderColor: fieldErrorStyle("deadline") })}
              />
              {showErrors && validation.errors.deadline
                ? <span id={`${fieldId("deadline")}-error`} role="alert" style={errorStyle}>{validation.errors.deadline}</span>
                : <span id={`${fieldId("deadline")}-hint`} style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 500 }}>Você pode manter o prazo original, mesmo vencido. Ao mudá-lo, escolha o mês atual ou futuro, até 120 meses desde o início.</span>}
            </label>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Ícone</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {options.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon })}
                    aria-label={`Ícone ${icon}`}
                    aria-pressed={draft.icon === icon}
                    style={{ width: 48, height: 48, borderRadius: 14, border: `2px solid ${draft.icon === icon ? "var(--accent)" : "var(--line)"}`, background: draft.icon === icon ? "var(--accent-soft)" : "var(--surface)", color: "var(--accent-t)" }}
                  >
                    <I name={icon} />
                  </button>
                ))}
              </div>
              {showErrors && validation.errors.icon && <div role="alert" style={errorStyle}>{validation.errors.icon}</div>}
            </div>

            <div aria-live="polite" style={{ padding: 14, borderRadius: 15, background: "var(--surface2)", color: "var(--ink2)", fontSize: 14, lineHeight: 1.5 }}>
              Com o valor atual, são <b style={{ color: "var(--ink)" }}>{brl(preview.monthly)}/mês</b> até {monthYear(preview.until)}. O total já guardado continua sendo acompanhado separadamente.
            </div>

            {saveAction.error && (
              <div role="alert" style={{ padding: 12, borderRadius: 12, background: "var(--risk-soft)", color: "var(--risk-t)", fontSize: 14, fontWeight: 700 }}>
                {(saveAction.error as Error).message || "Não foi possível atualizar agora. Tente novamente."}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={closeEditor} disabled={saveAction.isPending} style={{ ...btnSecondary(50), flex: "1 1 120px", opacity: saveAction.isPending ? 0.6 : 1 }}>Cancelar</button>
              <button type="submit" disabled={saveAction.isPending} style={{ ...btnPrimary(50), flex: "1 1 180px", opacity: saveAction.isPending ? 0.72 : 1 }}>
                {saveAction.isPending ? <><I name="progress_activity" style={{ animation: "pp-spin 1s linear infinite" }} /> Salvando…</> : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      </Sheet>
    </>
  );
}

function durationFromStart(startMonth: string, deadline: string): number {
  const [sy, sm] = startMonth.split("-").map(Number);
  const [dy, dm] = deadline.split("-").map(Number);
  return (dy - sy) * 12 + dm - sm + 1;
}

const errorStyle = { fontSize: 13, color: "var(--risk-t)", fontWeight: 700 };
