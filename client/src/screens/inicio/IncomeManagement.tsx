import { useEffect, useRef, useState, type FormEvent } from "react";
import { brl } from "@shared/format";
import { api, useAction } from "@/lib/api";
import { useApp } from "@/lib/app";
import { btnPrimary, btnSecondary, CloseBtn, I, input, labelCol, Sheet } from "@/ui";
import { validateIncomeDraft, type IncomeDraft, type IncomeValues } from "./income-validation";

type Income = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  payDay: number;
  recurring: boolean;
  createdAt: Date | string;
};

const emptyDraft: IncomeDraft = { name: "", amount: "", payDay: "", recurring: true };
const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function IncomeManagement({ incomes, compact = false }: { incomes: Income[]; compact?: boolean }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<IncomeDraft>(emptyDraft);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);
  const [pane, setPane] = useState<"list" | "form">("list");
  const [attempted, setAttempted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const createIncome = useAction<IncomeValues, Income>((values) => api<Income>("POST", "/api/incomes", values));
  const updateIncome = useAction<{ id: string; values: IncomeValues }, Income>(({ id, values }) => api<Income>("PATCH", `/api/incomes/${id}`, values));
  const deleteIncome = useAction<string, { ok: true }>((id) => api<{ ok: true }>("DELETE", `/api/incomes/${id}`));
  const mutationPending = createIncome.isPending || updateIncome.isPending || deleteIncome.isPending;
  const validation = validateIncomeDraft(draft);
  const formError = createIncome.error || updateIncome.error;
  const managerError = deleteIncome.error;

  useEffect(() => {
    if (!open) return;
    const dialog = triggerRef.current?.ownerDocument.querySelector<HTMLElement>('[role="dialog"][aria-label^="Rendas"]');
    if (pane === "form" && !deleteTarget) nameRef.current?.focus();
    else dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const keepFocusInSheet = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const currentDialog = triggerRef.current?.ownerDocument.querySelector<HTMLElement>('[role="dialog"][aria-label^="Rendas"]');
      const focusable = currentDialog?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !currentDialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !currentDialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keepFocusInSheet);
    return () => window.removeEventListener("keydown", keepFocusInSheet);
  }, [open, pane, deleteTarget]);

  function resetForm() {
    setDraft(emptyDraft);
    setEditing(null);
    setPane("list");
    setAttempted(false);
    createIncome.reset();
    updateIncome.reset();
  }

  function closeManager() {
    if (mutationPending || submittingRef.current) return;
    setOpen(false);
    setDeleteTarget(null);
    resetForm();
    deleteIncome.reset();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function startCreate() {
    resetForm();
    setDeleteTarget(null);
    setPane("form");
    setOpen(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function startEdit(income: Income) {
    setEditing(income);
    setPane("form");
    setDeleteTarget(null);
    setAttempted(false);
    createIncome.reset();
    updateIncome.reset();
    setDraft({
      name: income.name,
      amount: income.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      payDay: String(income.payDay),
      recurring: income.recurring,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (mutationPending || submittingRef.current) return;
    if (!validation.values) {
      const firstInvalid = Object.keys(validation.errors)[0];
      if (firstInvalid === "name") nameRef.current?.focus();
      else if (firstInvalid === "amount") amountRef.current?.focus();
      else if (firstInvalid === "payDay") dayRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    try {
      if (editing) {
        await updateIncome.mutateAsync({ id: editing.id, values: validation.values });
        toast("Renda atualizada.");
      } else {
        await createIncome.mutateAsync(validation.values);
        toast("Renda adicionada.");
      }
      resetForm();
      requestAnimationFrame(() => addRef.current?.focus());
    } catch {
      // O erro da API permanece visível no formulário; os campos são preservados.
    } finally {
      submittingRef.current = false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || mutationPending || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await deleteIncome.mutateAsync(deleteTarget.id);
      toast("Renda removida.");
      setDeleteTarget(null);
    } catch {
      // O erro aparece na confirmação, sem descartar a seleção.
    } finally {
      submittingRef.current = false;
    }
  }

  const formMode = pane === "form";
  const showErrors = attempted;
  const label = formMode ? (editing ? "Editar renda" : "Adicionar renda") : "Rendas previstas";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen(true);
          setPane("list");
          setEditing(null);
          setDeleteTarget(null);
        }}
        aria-haspopup="dialog"
        aria-label="Gerenciar rendas"
        style={{ minHeight: compact ? 34 : 40, padding: compact ? "0 8px" : "0 12px", borderRadius: 11, border: "1px solid var(--brand-t)", background: "var(--brand-soft)", color: "var(--brand-t)", fontWeight: 800, fontSize: compact ? 12 : 13, whiteSpace: "nowrap" }}
      >
        {compact ? "Gerenciar" : "Gerenciar rendas"}
      </button>

      <Sheet open={open} onClose={closeManager} label="Rendas previstas" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--brand-t)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>
                <I name="payments" size={17} />
                Planejamento manual
              </div>
              <h2 style={{ margin: "7px 0 0", fontSize: 22, lineHeight: 1.2 }}>{label}</h2>
            </div>
            <CloseBtn onClick={closeManager} />
          </div>

          {!formMode && !deleteTarget && (
            <>
              <div style={{ padding: 14, borderRadius: 16, background: "var(--brand-soft)", color: "var(--ink2)", fontSize: 14, lineHeight: 1.5 }}>
                A previsão é uma estimativa manual, não confirma recebimento nem movimenta dinheiro. Só rendas incluídas entram na renda mensal prevista; as demais ficam registradas fora da previsão.
              </div>
              {incomes.length === 0 ? (
                <div style={{ padding: "28px 18px", textAlign: "center", borderRadius: 18, border: "1px dashed var(--line)", background: "var(--surface2)" }}>
                  <I name="account_balance_wallet" size={30} style={{ color: "var(--brand-t)" }} />
                  <div style={{ marginTop: 8, fontWeight: 800 }}>Nenhuma renda cadastrada</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "var(--ink3)" }}>Inclua salário, freelas ou aluguel para montar sua previsão do mês.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {incomes.map((income) => (
                    <article key={income.id} style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, overflowWrap: "anywhere" }}>{income.name}</div>
                        <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "4px 10px", color: "var(--ink2)", fontSize: 13 }}>
                          <span>{brl(income.amount, true)} por mês</span>
                          <span>Dia {income.payDay}{income.payDay === 31 ? " · no mês curto, no último dia" : ""}</span>
                        </div>
                        <span style={{ display: "inline-flex", marginTop: 7, padding: "3px 8px", borderRadius: 999, background: income.recurring ? "var(--good-soft)" : "var(--surface2)", color: income.recurring ? "var(--good-t)" : "var(--ink3)", fontSize: 12, fontWeight: 800 }}>
                          {income.recurring ? "Incluída na previsão" : "Fora da previsão"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" onClick={() => startEdit(income)} aria-label={`Editar ${income.name}`} style={iconButtonStyle}>
                          <I name="edit" size={19} />
                        </button>
                        <button type="button" onClick={() => { setDeleteTarget(income); deleteIncome.reset(); }} aria-label={`Excluir ${income.name}`} style={{ ...iconButtonStyle, color: "var(--risk-t)" }}>
                          <I name="delete" size={19} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <button ref={addRef} type="button" onClick={startCreate} style={btnPrimary(50)}>
                <I name="add" size={20} />
                Adicionar renda
              </button>
            </>
          )}

          {formMode && (
            <>
              <div style={{ padding: 13, borderRadius: 14, background: "var(--brand-soft)", color: "var(--ink2)", fontSize: 13, lineHeight: 1.45 }}>
                Esta é uma previsão manual. Ela não confirma recebimento em banco nem faz transferências. Dia 31 é aceito; em meses mais curtos, considere o último dia do mês.
              </div>
              <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label htmlFor="income-name" style={labelCol}>
                  Nome da renda
                  <input ref={nameRef} id="income-name" type="text" autoComplete="off" maxLength={80} value={draft.name} onChange={(event) => setDraft((old) => ({ ...old, name: event.target.value }))} placeholder="Salário, Freelance, Aluguel" aria-invalid={showErrors && !!validation.errors.name} aria-describedby={showErrors && validation.errors.name ? "income-name-error" : undefined} style={input(50, { borderColor: showErrors && validation.errors.name ? "var(--risk-t)" : undefined })} />
                  {showErrors && validation.errors.name && <span id="income-name-error" role="alert" style={fieldErrorStyle}>{validation.errors.name}</span>}
                </label>

                <label htmlFor="income-amount" style={labelCol}>
                  Valor mensal previsto
                  <input ref={amountRef} id="income-amount" type="text" inputMode="decimal" autoComplete="off" value={draft.amount} onChange={(event) => setDraft((old) => ({ ...old, amount: event.target.value }))} placeholder="R$ 0,00" aria-invalid={showErrors && !!validation.errors.amount} aria-describedby={showErrors && validation.errors.amount ? "income-amount-error" : "income-amount-hint"} style={input(50, { fontSize: 17, borderColor: showErrors && validation.errors.amount ? "var(--risk-t)" : undefined })} />
                  <span id="income-amount-hint" style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 500 }}>Estimativa do valor líquido que espera receber, até R$ 10.000.000,00.</span>
                  {showErrors && validation.errors.amount && <span id="income-amount-error" role="alert" style={fieldErrorStyle}>{validation.errors.amount}</span>}
                </label>

                <label htmlFor="income-day" style={labelCol}>
                  Dia previsto de recebimento
                  <input ref={dayRef} id="income-day" type="number" inputMode="numeric" min={1} max={31} step={1} value={draft.payDay} onChange={(event) => setDraft((old) => ({ ...old, payDay: event.target.value }))} placeholder="Ex.: 5" aria-invalid={showErrors && !!validation.errors.payDay} aria-describedby={showErrors && validation.errors.payDay ? "income-day-error" : "income-day-hint"} style={input(50, { maxWidth: 180, borderColor: showErrors && validation.errors.payDay ? "var(--risk-t)" : undefined })} />
                  <span id="income-day-hint" style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 500 }}>Dia 31 é permitido; em meses mais curtos, vale o último dia.</span>
                  {showErrors && validation.errors.payDay && <span id="income-day-error" role="alert" style={fieldErrorStyle}>{validation.errors.payDay}</span>}
                </label>

                <label htmlFor="income-recurring" style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: 14, borderRadius: 14, background: "var(--surface2)", cursor: "pointer" }}>
                  <input id="income-recurring" type="checkbox" checked={draft.recurring} onChange={(event) => setDraft((old) => ({ ...old, recurring: event.target.checked }))} style={{ width: 22, height: 22, margin: "1px 0 0", accentColor: "var(--brand)", flex: "none" }} />
                  <span>
                    <span style={{ display: "block", fontWeight: 800 }}>Incluir na renda mensal prevista</span>
                    <span style={{ display: "block", marginTop: 3, color: "var(--ink3)", fontSize: 13, lineHeight: 1.4 }}>Desmarcada, a renda continua registrada, mas não soma na previsão mensal.</span>
                  </span>
                </label>

                {formError && <div role="alert" style={apiErrorStyle}>{(formError as Error).message || "Não foi possível salvar agora. Tente novamente."}</div>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => { if (mutationPending) return; resetForm(); requestAnimationFrame(() => addRef.current?.focus()); }} disabled={mutationPending} style={{ ...btnSecondary(50), flex: "1 1 120px", opacity: mutationPending ? 0.6 : 1 }}>Cancelar</button>
                  <button type="submit" disabled={mutationPending} style={{ ...btnPrimary(50), flex: "1 1 180px", opacity: mutationPending ? 0.72 : 1 }}>
                    {mutationPending ? <><I name="progress_activity" style={{ animation: "pp-spin 1s linear infinite" }} />Salvando…</> : editing ? "Salvar alterações" : "Adicionar renda"}
                  </button>
                </div>
              </form>
            </>
          )}

          {deleteTarget && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 16, background: "var(--risk-soft)", color: "var(--ink2)", lineHeight: 1.5 }}>
                <b style={{ display: "block", color: "var(--risk-t)" }}>Excluir “{deleteTarget.name}”?</b>
                A renda deixará de aparecer na sua lista e na previsão mensal, se estiver incluída.
              </div>
              {managerError && <div role="alert" style={apiErrorStyle}>{(managerError as Error).message || "Não foi possível excluir agora. Tente novamente."}</div>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => { if (mutationPending) return; setDeleteTarget(null); deleteIncome.reset(); }} disabled={mutationPending} style={{ ...btnSecondary(50), flex: "1 1 120px" }}>Cancelar</button>
                <button type="button" onClick={() => void confirmDelete()} disabled={mutationPending} style={{ ...btnPrimary(50, { background: "var(--risk)", color: "var(--brand-on)" }), flex: "1 1 180px", opacity: mutationPending ? 0.72 : 1 }}>
                  {mutationPending ? "Excluindo…" : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

const iconButtonStyle = { width: 42, height: 42, border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface2)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" } as const;
const fieldErrorStyle = { fontSize: 13, color: "var(--risk-t)", fontWeight: 700 } as const;
const apiErrorStyle = { padding: 12, borderRadius: 12, background: "var(--risk-soft)", color: "var(--risk-t)", fontSize: 14, fontWeight: 700 } as const;
