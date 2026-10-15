import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useAction } from "@/lib/api";
import { useApp } from "@/lib/app";
import { brl } from "@shared/format";
import { btnPrimary, btnSecondary, CloseBtn, I, input, labelCol, Sheet } from "@/ui";
import { formatDraft, validateAmount } from "./amount";

type ContributionResult = {
  goal: unknown;
  amount: number;
  saved: number;
};

export function RegistrarValorGuardado({ goalId, goalName, saved }: { goalId: string; goalName: string; saved: number }) {
  const { toast } = useApp();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [attempted, setAttempted] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const idempotencyRef = useRef<{ amount: number; key: string } | null>(null);
  const contribution = useAction<{ amount: number; idempotencyKey: string }, ContributionResult>(
    ({ amount, idempotencyKey }) =>
      api<ContributionResult>("POST", `/api/goals/${goalId}/contributions`, { amount, idempotencyKey }),
    {
      onDone: () => {
        void queryClient.invalidateQueries({ queryKey: ["goal-history", goalId] });
        idempotencyRef.current = null;
      },
    },
  );
  const result = validateAmount(draft);
  const errorId = `contribution-error-${goalId}`;

  useEffect(() => {
    if (open) fieldRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = fieldRef.current?.closest<HTMLElement>('[role="dialog"]');
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

  function resetAndClose() {
    setOpen(false);
    setDraft("");
    setAttempted(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function closeDialog() {
    if (contribution.isPending || submittingRef.current) return;
    resetAndClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (contribution.isPending || submittingRef.current) return;
    if (result.error || result.amount === null) {
      fieldRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    try {
      if (!idempotencyRef.current || idempotencyRef.current.amount !== result.amount) {
        idempotencyRef.current = { amount: result.amount, key: crypto.randomUUID() };
      }
      const response = await contribution.mutateAsync({
        amount: result.amount,
        idempotencyKey: idempotencyRef.current.key,
      });
      toast(`${brl(response.amount, true)} registrados para “${goalName}”`);
      resetAndClose();
    } catch {
      // O erro da API é apresentado no próprio diálogo.
    } finally {
      submittingRef.current = false;
    }
  }

  const showFieldError = attempted || (draft.length > 0 && result.error !== null);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Registrar valor guardado para ${goalName}`}
        disabled={contribution.isPending}
        onClick={() => {
          contribution.reset();
          setOpen(true);
        }}
        style={{
          minHeight: 44,
          borderRadius: 12,
          border: "1px solid var(--brand-t)",
          background: "var(--brand-soft)",
          color: "var(--brand-t)",
          fontWeight: 800,
          opacity: contribution.isPending ? 0.65 : 1,
        }}
      >
        Registrar valor guardado
      </button>
      <Sheet open={open} onClose={closeDialog} label={`Registrar valor guardado para ${goalName}`} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--brand-t)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>
                <I name="savings" size={17} />
                Registro manual
              </div>
              <h2 style={{ margin: "7px 0 0", fontSize: 22, lineHeight: 1.2 }}>{goalName}</h2>
            </div>
            <CloseBtn onClick={closeDialog} />
          </div>

          <div style={{ padding: 14, borderRadius: 16, background: "var(--brand-soft)", color: "var(--ink2)", fontSize: 14, lineHeight: 1.5 }}>
            Este é apenas um registro para acompanhar sua meta. Nenhum dinheiro será transferido ou reservado em sua conta.
          </div>

          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: 14, borderRadius: 15, background: "var(--surface2)" }}>
                <div style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 700 }}>Já guardado</div>
                <div style={{ marginTop: 4, fontSize: 19, fontWeight: 900 }}>{brl(saved, true)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 15, background: "var(--good-soft)" }}>
                <div style={{ fontSize: 12, color: "var(--good-t)", fontWeight: 700 }}>Novo total previsto</div>
                <div style={{ marginTop: 4, fontSize: 19, fontWeight: 900, color: "var(--good-t)" }}>
                  {brl(saved + (result.amount ?? 0), true)}
                </div>
              </div>
            </div>

            <label htmlFor={`contribution-amount-${goalId}`} style={labelCol}>
              Valor adicional guardado
              <input
                ref={fieldRef}
                id={`contribution-amount-${goalId}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={draft}
                onChange={(event) => {
                  const next = formatDraft(event.target.value);
                  const nextAmount = validateAmount(next).amount;
                  if (idempotencyRef.current && nextAmount !== idempotencyRef.current.amount) idempotencyRef.current = null;
                  setDraft(next);
                }}
                onBlur={() => {
                  setAttempted(true);
                  if (result.amount !== null) setDraft(result.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }}
                aria-invalid={showFieldError && !!result.error}
                aria-describedby={`contribution-hint-${goalId}${showFieldError && result.error ? ` ${errorId}` : ""}`}
                placeholder="R$ 0,00"
                style={input(52, { fontSize: 18, fontWeight: 800, borderColor: showFieldError && result.error ? "var(--risk-t)" : undefined })}
              />
              <span id={`contribution-hint-${goalId}`} style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 500 }}>
                Digite o valor que quer somar, até R$ 10.000.000,00.
              </span>
              {showFieldError && result.error && (
                <span id={errorId} role="alert" style={{ fontSize: 13, color: "var(--risk-t)", fontWeight: 700 }}>
                  {result.error}
                </span>
              )}
            </label>

            {contribution.error && (
              <div role="alert" style={{ padding: 12, borderRadius: 12, background: "var(--risk-soft)", color: "var(--risk-t)", fontSize: 14, fontWeight: 700 }}>
                {(contribution.error as Error).message || "Não foi possível registrar agora. Tente novamente."}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={closeDialog} disabled={contribution.isPending} style={{ ...btnSecondary(50), flex: "1 1 120px", opacity: contribution.isPending ? 0.6 : 1 }}>
                Cancelar
              </button>
              <button type="submit" disabled={contribution.isPending} style={{ ...btnPrimary(50), flex: "1 1 180px", opacity: contribution.isPending ? 0.72 : 1 }}>
                {contribution.isPending ? (
                  <>
                    <I name="progress_activity" style={{ animation: "pp-spin 1s linear infinite" }} />
                    Registrando…
                  </>
                ) : (
                  "Confirmar registro"
                )}
              </button>
            </div>
          </form>
        </div>
      </Sheet>
    </>
  );
}
