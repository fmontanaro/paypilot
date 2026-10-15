// Contas (Contas.dc.html): conectadas, importações, contas manuais, dívidas pessoais e grupos de despesa.
import { useRef, useState } from "react";
import { bankOf } from "@shared/banks";
import { groupView, manualStatement, type Context } from "@shared/engine";
import { brl, dateBR, dayMonth, fromIso, monthYear, parseMoney } from "@shared/format";
import { hasFeature } from "@shared/plans";
import type { Connection } from "@shared/schema";
import { api, filesToUpload, useAction, useCtx } from "@/lib/api";
import { useApp } from "@/lib/app";
import { Bar, btnPrimary, card, check, I, input, Paywall, PillTabs, Sheet, TONE } from "@/ui";

const TABS = [
  { id: "conectadas", label: "Conectadas", icon: "link" },
  { id: "importacoes", label: "Importações", icon: "upload_file" },
  { id: "manuais", label: "Contas manuais", icon: "edit_note" },
  { id: "dividas", label: "Dívidas pessoais", icon: "handshake" },
  { id: "grupos", label: "Grupos de despesa", icon: "workspaces" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Contas() {
  const { sub, go, plan } = useApp();
  const tab = (TABS.some((t) => t.id === sub) ? sub : "conectadas") as Tab;
  const { ctx } = useCtx();
  if (!ctx) return null;
  const debt = ctx.data.personalDebts[0];
  const paid = debt ? ctx.data.personalDebtPayments.filter((p) => p.debtId === debt.id).reduce((a, p) => a + p.amount, 0) : 0;
  const PW: Record<string, [string, string]> = {
    manuais: ["Cartão emprestado da família, no mesmo lugar que os outros", "Lance gastos, leia a foto da fatura e saiba quanto transferir."],
    dividas: [debt ? `Faltam ${brl(debt.principal - paid)} para quitar a dívida com o ${debt.creditor}` : "Dívidas com pessoas, sem planilha", "Registre pagamentos e veja a data de quitação sem planilha."],
  };
  const g = ctx.data.groups[0];
  const gv = g ? groupView(g, ctx.data.obligations, ctx.data.transactions, ctx.today) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PillTabs label="Contas" tabs={TABS as unknown as { id: Tab; label: string; icon: string }[]} value={tab} onChange={(id) => go("contas", id)} />
      {tab === "conectadas" && <Conectadas ctx={ctx} />}
      {tab === "importacoes" && <Importacoes ctx={ctx} />}
      {tab === "manuais" && (hasFeature(plan, "contas_manuais") ? <Manuais ctx={ctx} /> : <Paywall need="plus" headline={PW.manuais[0]} detail={PW.manuais[1]} />)}
      {tab === "dividas" && (hasFeature(plan, "dividas_pessoais") ? <Dividas ctx={ctx} /> : <Paywall need="plus" headline={PW.dividas[0]} detail={PW.dividas[1]} />)}
      {tab === "grupos" && (hasFeature(plan, "grupos") ? <Grupos ctx={ctx} /> : <Paywall need={hasFeature(plan, "contas_manuais") ? "pilot" : "pilot"} headline={gv ? `${gv.group.name} custa ${brl(gv.yearly)} por ano` : "Junte o que é da empresa em um só lugar"} detail="Grupos de despesa juntam tudo o que é da empresa, de qualquer conta, com regras automáticas." />)}
    </div>
  );
}

function syncAgo(d: Date | string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (min < 2) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

function Conectadas({ ctx }: { ctx: Context }) {
  const { go, plan, toast, user } = useApp();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null);
  const disconnect = useAction((id: string) => api("DELETE", `/api/connections/${id}`), {
    onDone: () => {
      setDisconnecting(null);
      toast("Simulação desconectada. O histórico foi preservado.");
    },
  });
  const sync = useAction((id: string) => api("POST", `/api/connections/${id}/sync`), { onDone: () => (setSyncing(null), toast("Conta atualizada")) });
  const renew = useAction((id: string) => api("POST", `/api/connections/${id}/renew`), { onDone: () => toast("Consentimento renovado por 12 meses") });
  const conns = ctx.data.connections;
  return (
    <>
      <section role="status" style={{ ...card(18, 16), background: "var(--warn-soft)", color: "var(--warn-t)", lineHeight: 1.5 }}>
        <strong>Open Finance real ainda não está configurado.</strong>
        <div>As conexões de teste usam dados fictícios e não autorizam acesso ao seu banco. Para usar seus dados reais agora, importe um extrato OFX ou CSV.</div>
        {(conns.some((c) => c.provider === "sandbox") || ctx.data.accounts.some((a) => a.source === "simulacao")) && (
          <div style={{ marginTop: 8 }}>Há dados de simulação armazenados que podem afetar seus totais. Desconectar não apaga esse histórico nem corrige automaticamente seus saldos.</div>
        )}
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        {conns.map((c) => {
          const b = bankOf(c.institution);
          const days = Math.round((new Date(c.consentExpiresAt).getTime() - ctx.today.getTime()) / 86_400_000);
          const expiring = days <= 15;
          const isSync = syncing === c.id;
          const st = isSync ? TONE.muted : c.status === "erro" || expiring ? TONE.warn : TONE.good;
          const simulated = c.provider === "sandbox";
          const status = isSync ? "Atualizando simulação…" : simulated ? "Dados fictícios — sem conexão real" : c.status === "erro" ? c.lastError || "Não conseguimos atualizar" : `Sincronizado ${syncAgo(c.lastSyncAt)}`;
          const action = isSync ? "" : c.status === "erro" ? "Tentar de novo" : expiring ? "Renovar consentimento" : "";
          return (
            <article key={c.id} style={{ ...card(20, 16), display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: b.c, color: b.tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flex: "none" }}>
                  {b.m}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{c.institution}</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)" }}>{c.itemsLabel}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: st.bg, color: st.fg, fontSize: 14, fontWeight: 700 }}>
                <I name={isSync ? "progress_activity" : c.status === "erro" || expiring ? "schedule" : "check_circle"} size={18} style={isSync ? { animation: "pp-spin 1s linear infinite" } : undefined} />
                {status}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink2)", display: "flex", gap: 6, alignItems: "center" }}>
                <I name="verified_user" size={18} />
                {simulated ? "Simulação: nenhuma autorização foi dada no banco." : expiring ? `Consentimento vence em ${days} dias (${dateBR(new Date(c.consentExpiresAt))})` : `Consentimento válido até ${dateBR(new Date(c.consentExpiresAt))}`}
              </div>
              {action && (!simulated || user?.isDemo) && (
                <button
                  onClick={() => {
                    if (c.status === "erro") {
                      setSyncing(c.id);
                      sync.mutate(c.id);
                    } else renew.mutate(c.id);
                  }}
                  style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800 }}
                >
                  {simulated ? "Atualizar simulação" : action}
                </button>
              )}
              <button
                type="button"
                aria-label={`Desconectar ${c.institution}`}
                disabled={disconnect.isPending || isSync || renew.isPending}
                onClick={() => {
                  disconnect.reset();
                  setDisconnecting(c);
                }}
                style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--bad-t)", fontWeight: 800 }}
              >
                Desconectar {simulated ? "simulação" : "banco"}
              </button>
            </article>
          );
        })}
        <button onClick={() => go("onb", user?.isDemo ? "banco" : "upload")} style={{ minHeight: 180, borderRadius: 20, border: "2px dashed var(--line)", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--brand-t)", fontWeight: 800 }}>
          <I name="add_link" size={32} />
          {user?.isDemo ? "Simular outra instituição" : "Importar dados reais por arquivo"}
        </button>
      </div>
      {plan === "gratis" && <div style={{ fontSize: 13, color: "var(--ink3)" }}>No plano Grátis, 1 conta via Open Finance. A importação de arquivos é ilimitada.</div>}
      <Sheet open={!!disconnecting} onClose={() => !disconnect.isPending && setDisconnecting(null)} label={`Desconectar ${disconnecting?.institution || "instituição"}`}>
        <h2>Desconectar {disconnecting?.institution}?</h2>
        <p style={{ lineHeight: 1.6 }}>O vínculo será removido do PayPilot. As contas, os lançamentos e os saldos já armazenados serão mantidos, identificados como simulação.</p>
        <p style={{ lineHeight: 1.6 }}>Não existe autorização bancária real para revogar nesta simulação. Seus dados de exemplo continuarão no histórico e nos totais.</p>
        {disconnect.error && <p role="alert" style={{ color: "var(--bad-t)" }}>{disconnect.error.message}</p>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button disabled={disconnect.isPending} onClick={() => setDisconnecting(null)} style={{ ...btnPrimary(48), background: "var(--surface2)", color: "var(--ink)", padding: "0 20px" }}>Cancelar</button>
          <button disabled={disconnect.isPending} onClick={() => disconnecting && disconnect.mutate(disconnecting.id)} style={{ ...btnPrimary(48), padding: "0 20px" }}>
            {disconnect.isPending ? "Desconectando…" : "Confirmar desconexão"}
          </button>
        </div>
      </Sheet>
    </>
  );
}

function Importacoes({ ctx }: { ctx: Context }) {
  const { go, user } = useApp();
  const remind = user?.prefs?.importReminder ?? true;
  const toggle = useAction(() => api("PATCH", "/api/me", { prefs: { importReminder: !remind } }), { me: true });
  const next = new Date(ctx.today.getFullYear(), ctx.today.getMonth() + (ctx.today.getDate() >= 5 ? 1 : 0), 5);
  const fileAccounts = ctx.data.accounts.filter((a) => a.source !== "open_finance" && a.source !== "simulacao");
  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 16, borderRadius: 20, background: "var(--brand-soft)" }}>
        <I name="notifications_active" style={{ color: "var(--brand-t)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800 }}>Próximo envio: {dayMonth(next).replace(" ", " de ")}</div>
          <div style={{ fontSize: 14, color: "var(--ink2)" }}>{fileAccounts.length ? `Extratos e faturas de: ${fileAccounts.map((a) => ctx.accountLabel(a.id)).join(", ")}.` : "Extrato e faturas do mês que passou."}</div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, minHeight: 44 }}>
          Lembrete
          <input type="checkbox" checked={remind} onChange={() => toggle.mutate(undefined)} style={check} />
        </label>
      </div>
      <button onClick={() => go("onb", "upload")} style={{ minHeight: 96, borderRadius: 20, border: "2px dashed var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 800, color: "var(--brand-t)" }}>
        <I name="upload_file" size={28} />
        Enviar extratos ou faturas
      </button>
      <section style={{ ...card(20, "4px 16px") }}>
        {ctx.data.imports.map((f) => (
          <div key={f.id} style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr) auto", gap: 12, alignItems: "center", minHeight: 64, borderBottom: "1px solid var(--line)" }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "var(--ink2)" }}>{f.format.toUpperCase().slice(0, 4)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.fileName}</div>
              <div style={{ fontSize: 12, color: "var(--ink3)" }}>{f.message && f.status !== "lido" ? f.message : `${f.message ? f.message + " · " : "Enviado "}${dateBR(new Date(f.createdAt))}`}</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: f.status === "lido" ? "var(--good-t)" : "var(--warn-t)", display: "flex", gap: 4, alignItems: "center" }}>
              <I name={f.status === "lido" ? "check_circle" : "schedule"} size={16} />
              {f.status === "lido" ? `${f.txCount} ${f.format === "jpg" ? "lançamentos" : "transações"}` : f.status === "pendente" ? "Pendente" : "Erro"}
            </span>
          </div>
        ))}
        {!ctx.data.imports.length && <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink3)" }}>Nenhum arquivo enviado ainda.</div>}
      </section>
    </>
  );
}

function Manuais({ ctx }: { ctx: Context }) {
  const { toast } = useApp();
  const accs = ctx.data.accounts.filter((a) => a.kind === "cartao_manual");
  const [adding, setAdding] = useState(false);
  const [nName, setNName] = useState("");
  const [nVal, setNVal] = useState("");
  const [attached, setAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const a = accs[0];
  const add = useAction((v: { description: string; amount: number }) => api("POST", `/api/accounts/${a.id}/entries`, v), { onDone: () => (setNName(""), setNVal(""), setAdding(false), toast("Gasto lançado")) });
  const attach = useAction(async (f: File) => {
    const [u] = await filesToUpload([f]);
    return api<{ status: string; message: string | null }>("POST", `/api/accounts/${a.id}/statement`, { name: u.name, content: u.content, mime: u.mime });
  }, { onDone: (r) => (setAttached(r.status === "lido" ? "Fatura lida" : "Fatura anexada"), r.message && toast(r.message)) });
  if (!a) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Nenhuma conta manual ainda. Use para cartões fora do Open Finance, como um cartão emprestado da família.</div>;
  const st = manualStatement(a.closingDay ?? 1, a.dueDay ?? 10, a.id, ctx.data.transactions, ctx.today);
  const limit = a.creditLimit ?? 0;
  const payTx = ctx.data.transactions.find((t) => t.kind === "pagamento_fatura" && new RegExp(a.ownerName || "§", "i").test(t.description));
  return (
    <article style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span aria-hidden style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
          {(a.ownerName || a.name)[0]}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{a.name}</div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>
            Conta manual · fecha dia {a.closingDay} · vence dia {a.dueDay}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 24, fontWeight: 900 }}>{brl(st.used, true)}</span>
        <span style={{ color: "var(--ink3)" }}>de {brl(limit)} de limite</span>
      </div>
      <Bar pct={limit ? st.used / limit : 0} color="var(--accent)" aria={`${brl(st.used, true)} usados de ${brl(limit)}`} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, borderRadius: 16, background: "var(--warn-soft)" }}>
        <I name="send_money" style={{ color: "var(--warn-t)" }} />
        <div style={{ flex: 1, fontSize: 14 }}>
          <b>
            A transferir para {a.ownerName || "o dono"}: {brl(st.used, true)}
          </b>
          <div style={{ color: "var(--ink2)" }}>até {dayMonth(st.dueDate)}, dia do vencimento</div>
        </div>
      </div>
      {payTx && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--ink2)", lineHeight: 1.45 }}>
          <I name="join_inner" size={18} style={{ color: "var(--good-t)" }} />O Pix de {brl(payTx.amount)} de {dayMonth(fromIso(payTx.date))} foi reconhecido como pagamento da fatura anterior e não conta como gasto duas vezes.
        </div>
      )}
      <div style={{ fontWeight: 800 }}>Gastos lançados</div>
      {st.entries.map((g) => (
        <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, minHeight: 48, alignItems: "center", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
          <span>
            <b>{g.description}</b> <span style={{ color: "var(--ink3)" }}>· {dayMonth(fromIso(g.date))}</span>
          </span>
          <b>{brl(g.amount, true)}</b>
        </div>
      ))}
      {adding && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Descrição" aria-label="Descrição" style={input(48, { flex: "2 1 160px", fontWeight: 500 })} />
          <input inputMode="decimal" value={nVal} onChange={(e) => setNVal(e.target.value)} placeholder="Valor" aria-label="Valor" style={input(48, { flex: "1 1 100px" })} />
          <button
            onClick={() => {
              const v = parseMoney(nVal);
              if (v > 0) add.mutate({ description: nName.trim() || "Gasto", amount: v });
            }}
            style={btnPrimary(48, { borderRadius: 12, padding: "0 16px" })}
          >
            Lançar
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && attach.mutate(e.target.files[0])} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button onClick={() => setAdding(!adding)} style={{ minHeight: 48, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <I name="add" size={18} />
          Lançar gasto
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ minHeight: 48, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <I name={attach.isPending ? "progress_activity" : "attach_file"} size={18} style={attach.isPending ? { animation: "pp-spin 1s linear infinite" } : undefined} />
          {attached || "Foto ou PDF da fatura"}
        </button>
      </div>
    </article>
  );
}

function Dividas({ ctx }: { ctx: Context }) {
  const { toast } = useApp();
  const d = ctx.data.personalDebts[0];
  const pay = useAction((amount: number) => api("POST", `/api/personal-debts/${d.id}/payments`, { amount }), { onDone: (_r, v) => toast(`Pagamento de ${brl(v)} registrado`) });
  if (!d) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Nenhuma dívida com pessoas registrada.</div>;
  const hist = ctx.data.personalDebtPayments.filter((p) => p.debtId === d.id);
  const paid = hist.reduce((a, p) => a + p.amount, 0);
  const saldo = Math.max(0, d.principal - paid);
  const months = d.plannedMonthly ? Math.ceil(saldo / d.plannedMonthly) : 0;
  const end = new Date(ctx.today.getFullYear(), ctx.today.getMonth() + months, 1);
  const start = fromIso(d.startDate);
  return (
    <article style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--brand-soft)", color: "var(--brand-t)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{d.creditor.slice(0, 1).toUpperCase() + (ctx.data.user.name.split(" ").slice(-1)[0]?.[0] || "")}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>
            {d.creditor}
            {d.relation ? ` (${d.relation})` : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>
            Emprestou {brl(d.principal)} em {monthYear(start)} · {d.monthlyRate ? `${d.monthlyRate}% a.m.` : "sem juros"}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink3)" }}>Saldo</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{brl(saldo)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink3)" }}>Já pago</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--good-t)" }}>{brl(paid)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink3)" }}>Quitação</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{saldo ? monthYear(end) : "quitada"}</div>
        </div>
      </div>
      <Bar pct={d.principal ? paid / d.principal : 0} color="var(--good)" aria={`${brl(paid)} pagos de ${brl(d.principal)}`} />
      <div style={{ fontWeight: 800 }}>Histórico de pagamentos</div>
      {hist.map((h) => (
        <div key={h.id} style={{ display: "flex", justifyContent: "space-between", minHeight: 48, alignItems: "center", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
          <span>
            {dayMonth(fromIso(h.date))} <span style={{ color: "var(--ink3)" }}>· {h.method}</span>
          </span>
          <b>{brl(h.amount)}</b>
        </div>
      ))}
      {saldo > 0 && (
        <button onClick={() => pay.mutate(Math.min(saldo, d.plannedMonthly))} style={btnPrimary(50)}>
          Registrar pagamento de {brl(Math.min(saldo, d.plannedMonthly))}
        </button>
      )}
      <div style={{ fontSize: 12, color: "var(--ink3)" }}>Um Pix pode ser dividido entre fatura e esta dívida no detalhe da transação.</div>
    </article>
  );
}

function Grupos({ ctx }: { ctx: Context }) {
  const toggle = useAction((v: { id: string; enabled: boolean }) => api("PATCH", `/api/category-rules/${v.id}`, { enabled: v.enabled }));
  const g = ctx.data.groups[0];
  if (!g) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Nenhum grupo de despesa ainda. Use para centros de custo como uma empresa parada.</div>;
  const v = groupView(g, ctx.data.obligations, ctx.data.transactions, ctx.today);
  const rules = ctx.data.rules.filter((r) => r.groupId === g.id);
  const color = `oklch(0.6 0.13 ${g.hue})`;
  return (
    <article style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: `oklch(0.6 0.13 ${g.hue} / .16)`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name={g.icon} />
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{g.name}</div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{g.description}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--surface2)" }}>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>Total do mês</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{brl(v.monthTotal)}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--surface2)" }}>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>Custo anual</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{brl(v.yearly)}</div>
        </div>
      </div>
      <div style={{ fontWeight: 800 }}>Obrigações fixas</div>
      {v.obligations.map((o) => (
        <div key={o.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b>{o.name}</b>
            <b>{brl(o.amount)}/mês</b>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{o.detail}</div>
          {o.installmentsTotal && <Bar pct={(o.installmentsPaid ?? 0) / o.installmentsTotal} h={8} color={color} aria={`${o.installmentsPaid} de ${o.installmentsTotal} parcelas pagas`} />}
        </div>
      ))}
      <div style={{ fontWeight: 800 }}>Regras automáticas</div>
      {rules.map((r) => (
        <label key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 12px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>
            <span style={{ color: "var(--ink3)" }}>Se</span> <b>{r.label || r.pattern}</b> <span style={{ color: "var(--ink3)" }}>→</span> {g.name}
          </span>
          <input type="checkbox" checked={r.enabled} onChange={() => toggle.mutate({ id: r.id, enabled: !r.enabled })} style={check} />
        </label>
      ))}
    </article>
  );
}
