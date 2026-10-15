import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, useAction } from "@/lib/api";
import { brl } from "@shared/format";
import { btnPrimary, btnSecondary, CloseBtn, I, input, labelCol, Sheet } from "@/ui";
import { validateAmount } from "./amount";

type HistoryEntry = {
  id: string;
  kind: "initial" | "contribution" | "reversal" | "correction";
  amount: number;
  createdAt: string;
  participantName: string;
  actorName: string | null;
  reversesId: string | null;
  replacesId?: string | null;
  reason?: string | null;
  canCorrect: boolean;
  reversed: boolean;
};
type HistoryResponse = { saved: number; entries: HistoryEntry[]; initialized?: boolean };
type ReverseDraft = {
  entry: HistoryEntry;
  mode: "reverse" | "correct";
  amount: string;
  reason: string;
};
type ReverseInput = {
  entryId: string;
  confirmed: true;
  idempotencyKey: string;
  reason: string;
  replacementAmount?: number;
};

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const kindLabel: Record<HistoryEntry["kind"], string> = {
  initial: "Saldo inicial",
  contribution: "Valor guardado",
  reversal: "Estorno",
  correction: "Correção",
};

export function HistoricoMeta({ goalId }: { goalId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const submitting = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const [draft, setDraft] = useState<ReverseDraft | null>(null);
  const [idempotency, setIdempotency] = useState<{ signature: string; key: string } | null>(null);
  const history = useQuery<HistoryResponse>({
    queryKey: ["goal-history", goalId],
    queryFn: async () => {
      const data = await api<HistoryResponse>("GET", `/api/goals/${goalId}/contributions`);
      // A primeira leitura pode incluir saldo legado não atribuído ao grupo.
      if (data.initialized) void queryClient.invalidateQueries({ queryKey: ["snapshot"] });
      return data;
    },
    enabled: open,
  });
  const reverse = useAction<ReverseInput, { saved: number }>(
    ({ entryId, ...body }) => api("POST", `/api/goals/${goalId}/contributions/${entryId}/reverse`, body),
    { onDone: () => void queryClient.invalidateQueries({ queryKey: ["goal-history", goalId] }) },
  );

  useEffect(() => {
    if (!draft) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const fields = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])');
      const first = fields[0], last = fields[fields.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    }
    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", trapFocus);
      actionRef.current?.focus();
    };
  }, [!!draft]);

  function closeDraft() {
    if (reverse.isPending || submitting.current) return;
    setDraft(null); setIdempotency(null); reverse.reset();
  }

  const amountResult = draft ? validateAmount(draft.amount) : null;
  const reasonValid = !!draft && draft.reason.trim().length >= 3 && draft.reason.trim().length <= 300;
  const replacement = draft?.mode === "correct" ? amountResult?.amount ?? undefined : undefined;
  const currentSaved = history.data?.saved ?? 0;
  const projectedSaved = currentSaved - (draft?.entry.amount ?? 0) + (replacement ?? 0);
  const signature = draft
    ? JSON.stringify([draft.entry.id, draft.mode, replacement ?? null, draft.reason.trim()])
    : "";

  function updateDraft(next: ReverseDraft) {
    setDraft(next);
    setIdempotency((previous) => (previous?.signature === JSON.stringify([next.entry.id, next.mode, next.mode === "correct" ? validateAmount(next.amount).amount : null, next.reason.trim()]) ? previous : null));
  }

  async function confirmChange() {
    if (!draft || !reasonValid || reverse.isPending || submitting.current || (draft.mode === "correct" && (!amountResult?.amount || amountResult.error))) return;
    submitting.current = true;
    const key = idempotency?.signature === signature ? idempotency.key : crypto.randomUUID();
    if (idempotency?.signature !== signature) setIdempotency({ signature, key });
    try {
      await reverse.mutateAsync({
        entryId: draft.entry.id,
        confirmed: true,
        idempotencyKey: key,
        reason: draft.reason.trim(),
        ...(draft.mode === "correct" ? { replacementAmount: replacement } : {}),
      });
      setDraft(null);
      setIdempotency(null);
    } catch {
      // O rascunho e a chave permanecem para uma tentativa segura.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 14px", fontWeight: 800 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}><I name="history" size={18} /> Histórico de valores</span>
        <I name={open ? "expand_less" : "expand_more"} size={20} />
      </button>
      {open && (
        <div style={{ ...historyCardStyle }}>
          {history.isLoading ? (
            <div aria-label="Carregando histórico" style={{ display: "grid", gap: 10 }}>
              {[0, 1, 2].map((n) => <div key={n} style={{ height: 54, borderRadius: 12, background: "var(--surface2)", opacity: 0.75 }} />)}
            </div>
          ) : history.isError ? (
            <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "var(--warn-t)" }}>
              <span>Não foi possível carregar o histórico.</span>
              <button type="button" onClick={() => void history.refetch()} style={retryButton}>Tentar de novo</button>
            </div>
          ) : !history.data?.entries.length ? (
            <div style={{ padding: "10px 4px", color: "var(--ink2)", lineHeight: 1.5 }}>
              <b style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>Nenhum valor registrado ainda</b>
              Quando houver um registro, ele aparecerá aqui com a data e a pessoa responsável.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "2px 2px 12px", color: "var(--ink3)", fontSize: 12 }}>
                <span>Saldo registrado</span><b style={{ color: "var(--ink)", fontSize: 14 }}>{brl(history.data.saved, true)}</b>
              </div>
              {history.data.entries.map((entry) => {
                const original = entry.reversed || history.data.entries.some((item) => item.reversesId === entry.id);
                const linkedId = entry.reversesId || entry.replacesId;
                const linked = linkedId ? history.data.entries.find((item) => item.id === linkedId) : null;
                const valueColor = entry.kind === "reversal" ? "var(--warn-t)" : "var(--ink)";
                const displayAmount = entry.kind === "reversal" ? -Math.abs(entry.amount) : entry.amount;
                return (
                  <article key={entry.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 2px", borderTop: "1px solid var(--line)" }}>
                    <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: entry.kind === "reversal" ? "var(--warn-soft)" : "var(--brand-soft)", color: entry.kind === "reversal" ? "var(--warn-t)" : "var(--brand-t)" }}>
                      <I name={entry.kind === "initial" ? "flag" : entry.kind === "reversal" ? "undo" : entry.kind === "correction" ? "edit_note" : "savings"} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <b style={{ textDecoration: original ? "line-through" : undefined, color: original ? "var(--ink3)" : "var(--ink)" }}>{kindLabel[entry.kind]}</b>
                        <b style={{ color: valueColor, whiteSpace: "nowrap" }}>{displayAmount < 0 ? "−" : "+"}{brl(Math.abs(displayAmount), true)}</b>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3, color: "var(--ink3)", fontSize: 12, lineHeight: 1.45 }}>
                        {entry.kind === "initial" ? (
                          <span>Data anterior desconhecida · histórico iniciado em {dateLabel(entry.createdAt)}</span>
                        ) : (
                          <span>{dateLabel(entry.createdAt)} · responsável: {entry.actorName || entry.participantName}</span>
                        )}
                        {entry.kind === "initial" && <span>· participante: {entry.participantName} · responsável pelo registro anterior desconhecido</span>}
                      </div>
                      {original && <span style={reversedBadge}>Valor estornado</span>}
                      {linked && <div style={{ marginTop: 4, color: "var(--ink3)", fontSize: 12 }}>Relacionado a {kindLabel[linked.kind].toLocaleLowerCase("pt-BR")} de {dateLabel(linked.createdAt)}</div>}
                      {entry.reversesId && !linked && <div style={{ marginTop: 4, color: "var(--ink3)", fontSize: 12 }}>Relacionado ao registro anterior</div>}
                      {entry.reason && <div style={{ marginTop: 4, color: "var(--ink2)", fontSize: 12, overflowWrap: "anywhere" }}>Motivo: {entry.reason}</div>}
                    </div>
                    {entry.canCorrect && !original && (
                      <button type="button" onClick={(event) => { actionRef.current = event.currentTarget; reverse.reset(); setDraft({ entry, mode: "correct", amount: entry.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), reason: "" }); setIdempotency(null); }} aria-label={`Corrigir ou estornar ${brl(entry.amount, true)}`} style={iconButton}>
                        <I name="edit" size={18} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Sheet open={!!draft} onClose={closeDraft} label="Corrigir ou estornar registro" width={480}>
        {draft && (
          <div ref={dialogRef} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "var(--brand-t)", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>Ajuste do histórico</div>
                <h2 style={{ margin: "7px 0 0", fontSize: 22 }}>Corrigir este registro</h2>
              </div>
              <CloseBtn onClick={closeDraft} />
            </div>
            <div style={{ padding: 13, borderRadius: 14, background: "var(--surface2)", color: "var(--ink2)", fontSize: 14, lineHeight: 1.5 }}>
              Registro original: <b style={{ color: "var(--ink)" }}>{brl(draft.entry.amount, true)}</b> · {draft.entry.kind === "initial" ? "data anterior desconhecida" : dateLabel(draft.entry.createdAt)}
            </div>
            <div role="group" aria-label="Tipo de ajuste" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([{ id: "correct", label: "Corrigir valor" }, { id: "reverse", label: "Estornar tudo" }] as const).map((option) => (
                <button key={option.id} type="button" aria-pressed={draft.mode === option.id} onClick={() => updateDraft({ ...draft, mode: option.id })} style={{ minHeight: 46, padding: 8, borderRadius: 12, border: `2px solid ${draft.mode === option.id ? "var(--brand-t)" : "var(--line)"}`, background: draft.mode === option.id ? "var(--brand-soft)" : "var(--surface)", fontWeight: 800 }}>
                  {option.label}
                </button>
              ))}
            </div>
            {draft.mode === "correct" && (
              <label style={labelCol}>
                Novo valor correto
                <input
                  autoComplete="off"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(event) => updateDraft({ ...draft, amount: event.target.value })}
                  aria-invalid={!!amountResult?.error}
                  style={input(50, { fontSize: 17, fontWeight: 800, borderColor: amountResult?.error ? "var(--risk-t)" : undefined })}
                />
                <span style={{ fontSize: 12, color: "var(--ink3)" }}>O histórico registra o estorno do original e o novo valor.</span>
                {amountResult?.error && <span role="alert" style={{ color: "var(--risk-t)", fontSize: 13 }}>{amountResult.error}</span>}
              </label>
            )}
            <label style={labelCol}>
              Motivo do ajuste
              <textarea value={draft.reason} maxLength={300} onChange={(event) => updateDraft({ ...draft, reason: event.target.value })} rows={3} placeholder="Conte brevemente o que precisa ser ajustado" style={{ ...input(82, { padding: 12, resize: "vertical" }), height: "auto", minHeight: 82 }} />
              <span style={{ fontSize: 12, color: "var(--ink3)" }}>Obrigatório · de 3 a 300 caracteres ({draft.reason.trim().length}/300)</span>
            </label>
            <div style={{ padding: 14, borderRadius: 14, background: "var(--brand-soft)", color: "var(--ink2)", fontSize: 14 }}>
              <b style={{ color: "var(--ink)" }}>Prévia do saldo</b>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 7 }}>
                <span>{brl(currentSaved, true)} →</span>
                <b style={{ color: "var(--brand-t)" }}>{brl(projectedSaved, true)}</b>
              </div>
            </div>
            {reverse.error && <div role="alert" style={{ padding: 12, borderRadius: 12, background: "var(--risk-soft)", color: "var(--risk-t)", fontSize: 14, fontWeight: 700 }}>{(reverse.error as Error).message || "Não foi possível ajustar agora. Tente novamente."}</div>}
            <p style={{ margin: 0, color: "var(--ink3)", fontSize: 12, lineHeight: 1.45 }}>Este ajuste altera somente o acompanhamento da meta. Nenhuma transação financeira será criada.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" disabled={reverse.isPending} onClick={closeDraft} style={{ ...btnSecondary(50), flex: "1 1 120px" }}>Cancelar</button>
              <button type="button" disabled={reverse.isPending || !reasonValid || (draft.mode === "correct" && (!amountResult?.amount || !!amountResult.error))} onClick={() => void confirmChange()} style={{ ...btnPrimary(50), flex: "1 1 200px", opacity: reverse.isPending ? 0.7 : 1 }}>
                {reverse.isPending ? <><I name="progress_activity" style={{ animation: "pp-spin 1s linear infinite" }} /> Salvando…</> : "Confirmar ajuste"}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}

const historyCardStyle = { padding: 14, borderRadius: 16, border: "1px solid var(--line)", background: "var(--surface)" } as const;
const retryButton = { minHeight: 44, borderRadius: 12, padding: "0 14px", border: "1px solid var(--warn-t)", color: "var(--warn-t)", background: "var(--warn-soft)", fontWeight: 800 } as const;
const reversedBadge = { display: "inline-flex", marginTop: 5, padding: "2px 7px", borderRadius: 999, background: "var(--surface2)", color: "var(--ink3)", fontSize: 11, fontWeight: 800 } as const;
const iconButton = { width: 44, height: 44, flex: "none", borderRadius: 11, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--brand-t)", display: "grid", placeItems: "center" } as const;
