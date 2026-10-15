// Perfil e configurações + Planos (Perfil.dc.html e Paywall.dc.html).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { initials, brl, parseMoney, dateBR } from "@shared/format";
import { PLAN_CARDS, PLAN_NAMES, type PlanId } from "@shared/plans";
import { api, useAction } from "@/lib/api";
import { useApp } from "@/lib/app";
import { useThemeToggle } from "@/app/Shell";
import { btnPrimary, card, check, I, input, nunito, Segmented } from "@/ui";

export default function Perfil() {
  const { sub } = useApp();
  return sub === "planos" ? <Planos /> : <Config />;
}

function Planos() {
  const { plan, toast } = useApp();
  const setPlan = useAction((p: PlanId) => api("PUT", "/api/me/plan", { plan: p }), { me: true, onDone: (_r, p) => toast(`Agora você está no plano ${PLAN_NAMES[p]}`) });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5, maxWidth: 640 }}>O Grátis mostra o problema, o Plus organiza o mês e o Pilot tira você das dívidas. Sem comissão, sem venda de crédito: nossa receita é só a assinatura.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, alignItems: "stretch" }}>
        {PLAN_CARDS.map((p) => {
          const hl = p.id === "pilot";
          const cur = plan === p.id;
          return (
            <article key={p.id} style={{ position: "relative", background: hl ? "var(--brand-deep)" : "var(--surface)", color: hl ? "#fff" : "var(--ink)", border: `2px solid ${hl ? "var(--accent)" : "var(--line)"}`, borderRadius: 24, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {hl && <span style={{ alignSelf: "flex-start", padding: "5px 10px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 800 }}>Para quem tem dívidas</span>}
              <div>
                <div style={nunito(26)}>{PLAN_NAMES[p.id]}</div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>{p.who}</div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>
                {p.price}
                <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.8 }}>{p.per}</span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 14, lineHeight: 1.4 }}>
                {p.feats.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <I name="check" size={18} style={{ color: hl ? "#9BE0B5" : "var(--good-t)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setPlan.mutate(p.id)} disabled={cur || setPlan.isPending} style={{ marginTop: "auto", minHeight: 50, borderRadius: 14, border: cur ? (hl ? "1px solid rgba(255,255,255,.4)" : "1px solid var(--line)") : 0, background: cur ? "transparent" : hl ? "var(--accent)" : "var(--brand)", color: cur ? (hl ? "#fff" : "var(--ink2)") : "#fff", fontWeight: 800, fontSize: 15 }}>
                {cur ? "Seu plano atual" : p.id === "gratis" ? "Usar o Grátis" : `Assinar o ${PLAN_NAMES[p.id]}`}
              </button>
            </article>
          );
        })}
      </div>
      {setPlan.error && <div style={{ color: "var(--warn-t)", fontWeight: 700 }}>{(setPlan.error as Error).message}</div>}
      <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>Preços em definição. Cobrança pela App Store, Google Play ou pelo site. Cancele quando quiser.</div>
    </div>
  );
}

interface SessionRow {
  id: string;
  device: string;
  lastSeenAt: string;
  current: boolean;
}

function Config() {
  const { bp, go, user, plan, toast } = useApp();
  const qc = useQueryClient();
  const theme = useThemeToggle();
  const prefs = user!.prefs;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [budget, setBudget] = useState(String(prefs.debtBudget ?? ""));
  const [del, setDel] = useState(false);
  const [exported, setExported] = useState(false);
  const sessions = useQuery<SessionRow[]>({ queryKey: ["sessions"], queryFn: () => api("GET", "/api/me/sessions") });
  const patch = useAction((b: Record<string, unknown>) => api("PATCH", "/api/me", b), { me: true });
  const endS = useAction((id: string) => api("DELETE", `/api/me/sessions/${id}`), { onDone: () => qc.invalidateQueries({ queryKey: ["sessions"] }) });
  const logout = async () => {
    await api("POST", "/api/auth/logout").catch(() => null);
    qc.clear();
    go("onb", "boasvindas");
    window.location.reload();
  };
  const doDelete = async () => {
    await api("DELETE", "/api/me");
    qc.clear();
    go("onb", "boasvindas");
    window.location.reload();
  };
  const exportData = async () => {
    const res = await fetch("/api/me/export", { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paypilot-dados.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };
  const ini = user?.name ? initials(user.name) : (user?.email || "?").slice(0, 2).toUpperCase();
  const N: [keyof typeof prefs.notifications, string, string][] = [
    ["teto", "Tetos", "Aos 80% e 100% de cada categoria"],
    ["venc", "Vencimentos", "3 dias antes e no dia"],
    ["sem", "Resumo semanal", "Segundas, às 8h"],
    ["ext", "Lembrete de extrato", "Dia 5 de cada mês"],
  ];
  const sec = { ...card(22, "6px 18px") };
  const rowBtn = { width: "100%", display: "flex", gap: 10, alignItems: "center", minHeight: 56, border: 0, borderTop: "1px solid var(--line)", background: "none", textAlign: "left" as const, padding: 0 };
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: bp === "desktop" ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={{ ...card(22, 18), display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, flex: "none" }}>{ini}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Seu nome" placeholder="Seu nome" style={input(44, { width: "100%", fontSize: 16 })} />
              ) : (
                <div style={{ fontWeight: 800, fontSize: 18 }}>{user?.name || "Sem nome"}</div>
              )}
              <div style={{ fontSize: 14, color: "var(--ink3)" }}>{[user?.email, user?.phone].filter(Boolean).join(" · ")}</div>
            </div>
            <button
              onClick={() => {
                if (editing) patch.mutate({ name }, { onSuccess: () => toast("Dados atualizados") });
                setEditing(!editing);
              }}
              style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700 }}
            >
              {editing ? "Salvar" : "Editar"}
            </button>
          </section>
          <section style={{ ...card(22, "14px 18px"), display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Assinatura</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span>
                <b>Plano {PLAN_NAMES[plan]}</b> {plan !== "gratis" && <span style={{ color: "var(--ink3)" }}>· cobrança em definição</span>}
              </span>
              <button onClick={() => go("perfil", "planos")} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: 0, background: "var(--brand-soft)", color: "var(--brand-t)", fontWeight: 800 }}>
                Ver planos
              </button>
            </div>
          </section>
          <section style={{ ...card(22, "14px 18px"), display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Aparência</div>
            <Segmented
              role="radiogroup"
              label="Tema"
              value={theme.pref}
              onChange={(t) => theme.set(t)}
              options={[
                { id: "claro", label: <><I name="light_mode" size={18} />Claro</> },
                { id: "escuro", label: <><I name="dark_mode" size={18} />Escuro</> },
                { id: "sistema", label: <><I name="contrast" size={18} />Sistema</> },
              ]}
            />
          </section>
          <section style={sec}>
            <div style={{ fontWeight: 800, padding: "10px 0 4px" }}>Notificações</div>
            {N.map(([k, t, d]) => (
              <label key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 56, borderTop: "1px solid var(--line)" }}>
                <span>
                  <span style={{ display: "block", fontWeight: 700 }}>{t}</span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{d}</span>
                </span>
                <input type="checkbox" checked={!!prefs.notifications[k]} onChange={() => patch.mutate({ prefs: { notifications: { [k]: !prefs.notifications[k] } } })} style={check} />
              </label>
            ))}
          </section>
          <section style={{ ...card(22, "14px 18px"), display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>Plano de quitação</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.45 }}>Quanto você consegue destinar às dívidas por mês. O motor nunca usa menos que a soma dos mínimos.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex.: 5.000" aria-label="Valor mensal para dívidas" style={input(44, { flex: 1 })} />
              <button onClick={() => patch.mutate({ prefs: { debtBudget: parseMoney(budget) } }, { onSuccess: () => toast(`Plano recalculado com ${brl(parseMoney(budget))} por mês`) })} style={btnPrimary(44, { borderRadius: 12 })}>
                Salvar
              </button>
            </div>
          </section>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={sec}>
            <div style={{ fontWeight: 800, padding: "10px 0 4px" }}>Segurança</div>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 56, borderTop: "1px solid var(--line)" }}>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <I name="fingerprint" style={{ color: "var(--brand-t)" }} />
                <span>
                  <span style={{ display: "block", fontWeight: 700 }}>Biometria</span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>Face ID ou digital para abrir o app</span>
                </span>
              </span>
              <input type="checkbox" checked={prefs.biometric} onChange={() => patch.mutate({ prefs: { biometric: !prefs.biometric } })} style={check} />
            </label>
            <div style={{ fontWeight: 700, padding: "12px 0 4px", borderTop: "1px solid var(--line)" }}>Sessões ativas</div>
            {(sessions.data || []).map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 56, borderTop: "1px solid var(--line)" }}>
                <I name={/iPhone|Android/.test(s.device) ? "phone_iphone" : /iPad/.test(s.device) ? "tablet_mac" : "laptop_mac"} style={{ color: "var(--ink3)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.device}</div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>{s.current ? "agora" : `último acesso ${dateBR(new Date(s.lastSeenAt))}`}</div>
                </div>
                {s.current ? (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--good-t)" }}>Este aparelho</span>
                ) : (
                  <button onClick={() => endS.mutate(s.id)} style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700, fontSize: 13 }}>
                    Encerrar
                  </button>
                )}
              </div>
            ))}
          </section>
          <section style={sec}>
            <div style={{ fontWeight: 800, padding: "10px 0 4px" }}>Privacidade</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.45, paddingBottom: 8 }}>Seus dados são seus. Não vendemos, não usamos para treinar IA e você pode levar ou apagar tudo.</div>
            <button onClick={() => void exportData()} style={rowBtn}>
              <I name="download" style={{ color: "var(--ink3)" }} />
              <span style={{ flex: 1, fontWeight: 700 }}>{exported ? "Arquivo baixado" : "Exportar meus dados"}</span>
              <I name="chevron_right" style={{ color: "var(--ink3)" }} />
            </button>
            <button onClick={() => setDel(true)} style={{ ...rowBtn, color: "var(--risk-t)" }}>
              <I name="delete_forever" />
              <span style={{ flex: 1, fontWeight: 700 }}>Apagar todos os meus dados</span>
              <I name="chevron_right" />
            </button>
          </section>
          <section style={sec}>
            {[
              ["help", "Central de ajuda", () => toast("A central de ajuda chega com o lançamento público.")],
              ["forum", "Falar com o assistente", () => go("assistente")],
              ["description", "Termos de uso e privacidade", () => toast("Termos em revisão jurídica antes do beta.")],
            ].map(([i, t, on]) => (
              <button key={t as string} onClick={on as () => void} style={{ ...rowBtn, borderTop: 0, borderBottom: "1px solid var(--line)" }}>
                <I name={i as string} style={{ color: "var(--ink3)" }} />
                <span style={{ flex: 1, fontWeight: 700 }}>{t as string}</span>
                <I name="chevron_right" style={{ color: "var(--ink3)" }} />
              </button>
            ))}
            <button onClick={() => void logout()} style={{ width: "100%", minHeight: 56, border: 0, background: "none", fontWeight: 800, color: "var(--ink2)" }}>
              Sair da conta
            </button>
          </section>
        </div>
      </div>
      {del && (
        <>
          <div onClick={() => setDel(false)} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 60 }} />
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-h" style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 61, width: "min(420px,92vw)", background: "var(--surface)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 id="del-h" style={{ margin: 0, ...nunito(22) }}>
              Apagar todos os dados?
            </h2>
            <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5 }}>Vamos remover contas conectadas, arquivos, transações, metas e o histórico do assistente. Isso não pode ser desfeito. Recomendamos exportar antes.</p>
            <button onClick={() => setDel(false)} style={{ minHeight: 50, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800 }}>
              Manter meus dados
            </button>
            <button onClick={() => void doDelete()} style={{ minHeight: 50, borderRadius: 14, border: 0, background: "var(--risk)", color: "#fff", fontWeight: 800 }}>
              Apagar tudo
            </button>
          </div>
        </>
      )}
    </>
  );
}
