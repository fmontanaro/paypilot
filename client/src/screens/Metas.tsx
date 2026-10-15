// Metas (Metas.dc.html): lista, criar meta (valor mensal, de onde tirar, trade-off) e meta em grupo.
import { useState } from "react";
import { goalCalc, goalView, moneySources, type Context } from "@shared/engine";
import { brl, monthShort, monthYear, parseMoney } from "@shared/format";
import { hasFeature } from "@shared/plans";
import { api, useAction, useCtx } from "@/lib/api";
import { useApp } from "@/lib/app";
import { Bar, btnPrimary, btnSecondary, card, I, input, labelCol, nunito, Paywall, PillTabs } from "@/ui";
import { RegistrarValorGuardado } from "./metas/RegistrarValorGuardado";
import { HistoricoMeta } from "./metas/HistoricoMeta";
import { EditarMeta } from "./metas/EditarMeta";
import { isGoalInviteToken, isInviteContact } from "./metas/inviteValidation";

const TABS = [
  { id: "lista", label: "Minhas metas", icon: "flag" },
  { id: "criar", label: "Criar meta", icon: "add" },
  { id: "grupo", label: "Meta em grupo", icon: "group" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const ICONS = ["laptop_mac", "flight", "directions_car", "school", "home", "celebration", "medical_services", "savings"];

export default function Metas() {
  const { sub, go, plan } = useApp();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const tab = (TABS.some((t) => t.id === sub) ? sub : "lista") as Tab;
  const { ctx } = useCtx();
  if (!ctx) return null;
  const goals = ctx.data.goals.map((g) => goalView(g, ctx.data.goalMembers, ctx.today));
  const groupGoals = ctx.data.goals.filter((goal) => goal.isGroup);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PillTabs label="Metas" tabs={TABS as unknown as { id: Tab; label: string; icon: string }[]} value={tab} onChange={(id) => go("metas", id)} />
      <AcceptInvite />
      {!hasFeature(plan, "metas") ? (
        <>
        <Paywall need="plus" headline={goals[0] ? `Sua meta “${goals[0].name}” cabe com ${brl(goals[0].monthly)} por mês` : "Planeje suas metas sem atrasar a saída das dívidas"} detail="Mostramos de onde tirar o dinheiro e quanto isso mexe no seu plano." teaser={goals.slice(0, 3).map((g) => ({ a: g.name, b: brl(g.target) }))} />
        {groupGoals.length > 0 && <Grupo ctx={ctx} selectedGoalId={selectedGoalId ?? groupGoals[0].id} onSelectGoal={setSelectedGoalId} />}
        </>
      ) : tab === "lista" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
            {goals.map((g) => (
              <article key={g.id} style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <I name={g.icon} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{g.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink3)" }}>
                      Até {monthYear(g.until)}
                      {g.withNames.length ? ` · com ${g.withNames.join(", ")}` : ""}
                    </div>
                  </div>
                  {g.isGroup && (
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand-t)", fontSize: 12, fontWeight: 800, display: "flex", gap: 4, alignItems: "center" }}>
                      <I name="group" size={16} />
                      Em grupo
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 24, fontWeight: 900 }}>{brl(g.saved)}</span>
                  <span style={{ color: "var(--ink3)", fontSize: 14 }}>de {brl(g.target)}</span>
                </div>
                <Bar pct={g.pct} color="var(--good)" aria={`${g.name}: ${brl(g.saved)} de ${brl(g.target)}`} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--ink2)" }}>
                    Precisa de <b style={{ color: "var(--ink)" }}>{brl(g.monthly)}/mês</b>
                  </span>
                  <span style={{ color: "var(--good-t)", fontWeight: 800 }}>{Math.round(g.pct * 100)}% guardado</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(!g.isGroup || hasFeature(plan, "metas_grupo") || ctx.data.goals.find((goal) => goal.id === g.id)?.userId !== ctx.data.user.id) && <>
                    <RegistrarValorGuardado goalId={g.id} goalName={g.name} saved={g.isGroup ? ctx.data.goalMembers.find((m) => m.goalId === g.id && m.isMe)?.saved ?? 0 : g.saved} />
                    <HistoricoMeta goalId={g.id} />
                  </>}
                  {(() => {
                    const source = ctx.data.goals.find((goal) => goal.id === g.id);
                    const canEdit = source?.userId === ctx.data.user.id && (!g.isGroup || hasFeature(plan, "metas_grupo"));
                    return canEdit && source ? <EditarMeta goal={source} saved={g.saved} members={ctx.data.goalMembers} today={ctx.today} currentMonth={ctx.month} availableIcons={ctx.data.goals.map((goal) => goal.icon)} /> : null;
                  })()}
                  {ctx.data.goals.find((goal) => goal.id === g.id)?.userId === ctx.data.user.id && hasFeature(plan, "metas_grupo") && (
                    <InviteGoal goalId={g.id} goalName={g.name} />
                  )}
                  {g.isGroup && (
                    <button onClick={() => { setSelectedGoalId(g.id); go("metas", "grupo"); }} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800 }}>
                      Ver participantes
                    </button>
                  )}
                </div>
              </article>
            ))}
            <button onClick={() => go("metas", "criar")} style={{ minHeight: 200, borderRadius: 22, border: "2px dashed var(--line)", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--brand-t)", fontWeight: 800, fontSize: 16 }}>
              <I name="add_circle" size={32} />
              Criar meta
            </button>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.5 }}>Metas usam a sobra que o plano gera. O PayPilot não indica onde aplicar o dinheiro — essa decisão é sua.</div>
        </>
      ) : tab === "criar" ? (
        <Criar ctx={ctx} />
      ) : (
        <Grupo ctx={ctx} selectedGoalId={selectedGoalId ?? groupGoals[0]?.id ?? null} onSelectGoal={setSelectedGoalId} />
      )}
    </div>
  );
}

function Criar({ ctx }: { ctx: Context }) {
  const { bp, go, toast } = useApp();
  const [name, setName] = useState("");
  const [val, setVal] = useState("6000");
  const [months, setMonths] = useState(6);
  const [icon, setIcon] = useState("laptop_mac");
  const sources = moneySources(ctx.data.leaks, ctx.data.budgets);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(sources.map((s, i) => [s.key, i < 2])));
  const target = parseMoney(val);
  const chosen = sources.filter((s) => on[s.key]);
  const calc = goalCalc(target, months, chosen, ctx.debts, ctx.data.user.prefs?.debtBudget, ctx.today);
  const save = useAction((b: Record<string, unknown>) => api("POST", "/api/goals", b), {
    onDone: () => {
      toast(`Meta “${name.trim() || "Nova meta"}” criada`);
      go("metas", "lista");
    },
  });
  const until = new Date(ctx.today.getFullYear(), ctx.today.getMonth() + months - 1, 1);
  const coverPct = calc.monthly ? Math.min(1, calc.covered / calc.monthly) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: bp === "desktop" ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={labelCol}>
          Nome da meta
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Notebook novo" style={input(50, { fontSize: 16, fontWeight: 500 })} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={labelCol}>
            Valor
            <input inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)} style={input(50, { fontSize: 16 })} />
          </label>
          <label style={labelCol}>
            Prazo
            <select value={months} onChange={(e) => setMonths(+e.target.value)} style={input(50, { padding: "0 10px" })}>
              {[3, 6, 9, 12, 18].map((m) => (
                <option key={m} value={m}>
                  {m} meses
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Ícone</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ICONS.map((i) => (
              <button key={i} onClick={() => setIcon(i)} aria-label={i} aria-pressed={icon === i} style={{ width: 48, height: 48, borderRadius: 14, border: `2px solid ${icon === i ? "var(--accent)" : "var(--line)"}`, background: icon === i ? "var(--accent-soft)" : "var(--surface)", color: "var(--accent-t)" }}>
                <I name={i} />
              </button>
            ))}
          </div>
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "var(--brand-deep)", color: "#fff", borderRadius: 22, padding: 18 }}>
          <div style={{ fontSize: 13, color: "#D7EBDD", fontWeight: 700 }}>Você precisa separar</div>
          <div style={nunito(38)}>
            {brl(calc.monthly)}
            <span style={{ fontSize: 16 }}>/mês</span>
          </div>
          <div style={{ fontSize: 14, color: "#E6F2EA" }}>
            por {months} meses · até {monthShort(until.getMonth())} {until.getFullYear()}
          </div>
        </div>
        <div style={{ ...card(22, 16), display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>De onde tirar o dinheiro</div>
          {sources.length === 0 && <div style={{ fontSize: 14, color: "var(--ink2)" }}>Ainda não encontramos cortes. O valor sai da sobra do plano.</div>}
          {sources.map((s) => (
            <label key={s.key} style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 52, padding: "8px 10px", borderRadius: 14, border: `1px solid ${on[s.key] ? "var(--brand-t)" : "var(--line)"}`, background: on[s.key] ? "var(--brand-soft)" : "var(--surface)" }}>
              <input type="checkbox" checked={!!on[s.key]} onChange={() => setOn({ ...on, [s.key]: !on[s.key] })} style={{ width: 22, height: 22, accentColor: "var(--brand)", flex: "none" }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{s.title}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>{s.detail}</span>
              </span>
              <b style={{ fontSize: 14 }}>{brl(s.amount)}/mês</b>
            </label>
          ))}
          <Bar pct={coverPct} h={10} color="var(--good)" transition aria={`Cobre ${brl(Math.min(calc.covered, calc.monthly))} de ${brl(calc.monthly)}`} />
          <div style={{ fontSize: 13, color: "var(--ink2)" }}>{calc.gap > 0 ? `Cobre ${brl(calc.covered)} de ${brl(calc.monthly)}. Os ${brl(calc.gap)} restantes saem da sobra do plano.` : `Coberto sem mexer no plano${calc.covered > calc.monthly ? " — ainda sobram " + brl(calc.covered - calc.monthly) : ""}.`}</div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: 14, borderRadius: 18, background: "var(--warn-soft)" }}>
          <I name="balance" style={{ color: "var(--warn-t)" }} />
          <div style={{ fontSize: 14, lineHeight: 1.45 }}>
            <b>Trade-off:</b> {calc.trade}
          </div>
        </div>
        <button disabled={!target || save.isPending} onClick={() => save.mutate({ name: name.trim() || "Nova meta", icon, target, months, sources: chosen.map((s) => s.key) })} style={btnPrimary(54, { borderRadius: 16, fontSize: 16, opacity: target ? 1 : 0.5 })}>
          Criar meta
        </button>
      </section>
    </div>
  );
}

type InviteResult = { id: string; contact: string; token: string; expiresAt: string };

function InviteGoal({ goalId, goalName }: { goalId: string; goalName: string }) {
  const [contact, setContact] = useState("");
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const action = useAction<string, InviteResult>((value) => api<InviteResult>("POST", `/api/goals/${goalId}/invites`, { contact: value }), {
    onDone: (result) => { setInvite(result); setContact(""); setCopied(false); },
  });
  const valid = isInviteContact(contact);
  async function copyToken() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <section style={{ ...card(18, 14), display: "flex", flexDirection: "column", gap: 9 }}>
      <label htmlFor={`invite-${goalId}`} style={{ fontWeight: 800 }}>Convidar para esta meta</label>
      <div style={{ color: "var(--ink2)", fontSize: 13, lineHeight: 1.45 }}>Quando a pessoa aceitar, os participantes verão os detalhes, nomes, valores guardados e histórico desta meta. Nenhuma conta, renda ou gasto pessoal será compartilhado.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input id={`invite-${goalId}`} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="E-mail ou celular" autoComplete="email" style={input(48, { flex: "1 1 180px", fontWeight: 500 })} />
        <button type="button" disabled={!valid || action.isPending} onClick={() => action.mutate(contact.trim())} style={{ ...btnPrimary(48, { borderRadius: 12, padding: "0 16px" }), opacity: !valid || action.isPending ? 0.65 : 1 }}>
          {action.isPending ? "Gerando…" : "Gerar convite"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--ink3)", fontSize: 12, lineHeight: 1.45 }}>
        <I name="lock" size={16} />
        <span>O convite não é enviado automaticamente. Compartilhe o código com a pessoa por um canal seguro. Só as contribuições para “{goalName}” ficam visíveis.</span>
      </div>
      {action.error && <div role="alert" style={{ color: "var(--risk-t)", fontSize: 13, fontWeight: 700 }}>{(action.error as Error).message || "Não foi possível gerar o convite. Tente novamente."}</div>}
      {invite && (
        <div style={{ borderRadius: 14, padding: 12, background: "var(--brand-soft)", display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ color: "var(--brand-t)", fontSize: 14 }}>Código pronto para compartilhar com {invite.contact}</b>
          <label htmlFor={`token-${goalId}`} style={{ fontSize: 12, color: "var(--ink2)" }}>Código de acesso</label>
          <input id={`token-${goalId}`} readOnly value={invite.token} onFocus={(event) => event.currentTarget.select()} style={input(46, { fontFamily: "monospace", fontSize: 13, letterSpacing: ".04em" })} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "var(--ink2)", fontSize: 12 }}>Válido até {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(invite.expiresAt))}</span>
            <button type="button" onClick={() => void copyToken()} style={{ ...btnSecondary(42), minWidth: 112 }}>{copied ? "Código copiado" : "Copiar código"}</button>
          </div>
          {!copied && <span style={{ color: "var(--ink3)", fontSize: 12 }}>A pessoa também pode selecionar o código acima e copiar manualmente.</span>}
        </div>
      )}
    </section>
  );
}

function AcceptInvite() {
  const [token, setToken] = useState("");
  const [acceptedGoalId, setAcceptedGoalId] = useState<string | null>(null);
  const action = useAction<string, { goalId: string }>((value) => api<{ goalId: string }>("POST", "/api/goal-invites/accept", { token: value }), {
    onDone: (result) => { setAcceptedGoalId(result.goalId); setToken(""); },
  });
  const valid = isGoalInviteToken(token);
  return (
    <section aria-labelledby="accept-invite-title" style={{ ...card(18, 14), display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: 12, display: "grid", placeItems: "center", background: "var(--brand-soft)", color: "var(--brand-t)" }}><I name="vpn_key" /></span>
        <div>
          <h2 id="accept-invite-title" style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Recebeu um convite para uma meta?</h2>
          <div style={{ marginTop: 3, color: "var(--ink2)", fontSize: 13, lineHeight: 1.45 }}>Insira o código de 64 caracteres. Sua conta precisa corresponder ao e-mail ou celular convidado. Disponível em todos os planos.</div>
          <div style={{ marginTop: 5, color: "var(--ink2)", fontSize: 13, lineHeight: 1.45 }}>Ao aceitar, você compartilha seu nome e os valores e registros que fizer nesta meta com os participantes. Renda, contas e gastos pessoais não são compartilhados.</div>
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); if (valid && !action.isPending) action.mutate(token.trim()); }} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label htmlFor="goal-invite-code" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Código do convite</label>
        <input id="goal-invite-code" value={token} onChange={(event) => { setToken(event.target.value.replace(/\s/g, "")); action.reset(); setAcceptedGoalId(null); }} maxLength={64} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Cole aqui o código do convite" style={input(48, { flex: "1 1 240px", fontFamily: "monospace", fontSize: 14, letterSpacing: ".04em" })} />
        <button type="submit" disabled={!valid || action.isPending} style={{ ...btnPrimary(48, { borderRadius: 12, padding: "0 16px" }), opacity: !valid || action.isPending ? 0.65 : 1 }}>
          {action.isPending ? "Validando…" : "Aceitar convite"}
        </button>
      </form>
      {action.isError && <div role="alert" style={{ padding: 10, borderRadius: 12, background: "var(--risk-soft)", color: "var(--risk-t)", fontSize: 13, fontWeight: 700 }}>{(action.error as Error).message || "Não foi possível aceitar este convite. Confira o código e tente novamente."}</div>}
      {acceptedGoalId && <div role="status" style={{ padding: 10, borderRadius: 12, background: "var(--good-soft)", color: "var(--good-t)", fontSize: 13, fontWeight: 800 }}>Convite aceito. A meta compartilhada já está disponível na sua lista.</div>}
    </section>
  );
}

function Grupo({ ctx, selectedGoalId, onSelectGoal }: { ctx: Context; selectedGoalId: string | null; onSelectGoal: (id: string) => void }) {
  const { bp, plan } = useApp();
  const groupGoals = ctx.data.goals.filter((goal) => goal.isGroup);
  const g = groupGoals.find((goal) => goal.id === selectedGoalId) ?? groupGoals[0];
  if (!g) return <div style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 8, color: "var(--ink2)" }}>
    <b style={{ color: "var(--ink)", fontSize: 17 }}>Suas metas compartilhadas ficam por aqui</b>
    <span>Convide alguém em uma meta pessoal. Ela passa a ser compartilhada quando a pessoa aceita o convite.</span>
  </div>;
  const v = goalView(g, ctx.data.goalMembers, ctx.today);
  const members = ctx.data.goalMembers.filter((member) => member.goalId === g.id).sort((a, b) => Number(b.isMe) - Number(a.isMe));
  const COLORS = ["var(--brand)", "var(--accent)", "var(--warn)", "var(--good)"];
  const isOwner = g.userId === ctx.data.user.id;
  return (
    <>
      {groupGoals.length > 1 && (
        <label style={labelCol}>
          Escolha a meta compartilhada
          <select value={g.id} onChange={(event) => onSelectGoal(event.target.value)} style={input(48, { padding: "0 12px" })}>
            {groupGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
          </select>
        </label>
      )}
      <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center" }}><I name={g.icon} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={nunito(22)}>{g.name}</div>
            <div style={{ fontSize: 14, color: "var(--ink2)" }}>{brl(g.target)} em {g.months} meses · até {monthYear(v.until)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 900 }}>{brl(v.saved)}</span>
          <span style={{ color: "var(--ink3)" }}>{Math.round(v.pct * 100)}% de {brl(g.target)}</span>
        </div>
        <div role="img" aria-label={`${brl(v.saved)} de ${brl(g.target)} guardados no total`} style={{ display: "flex", height: 14, borderRadius: 7, background: "var(--surface2)", overflow: "hidden" }}>
          {members.map((member, index) => <div key={member.id} style={{ width: `${Math.max(0, Math.min(100, (member.saved / Math.max(g.target, 1)) * 100))}%`, background: COLORS[index % COLORS.length] }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          {members.map((member, index) => (
            <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 10px", borderRadius: 12, background: "var(--surface2)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, flex: "none", background: COLORS[index % COLORS.length] }} />
                <span style={{ overflowWrap: "anywhere" }}>{member.isMe ? `${member.name} (você)` : member.name}</span>
              </span>
              <b style={{ whiteSpace: "nowrap" }}>{brl(member.saved)}</b>
            </div>
          ))}
        </div>
        <div style={{ padding: 11, borderRadius: 12, background: "var(--brand-soft)", color: "var(--ink2)", fontSize: 13, lineHeight: 1.45 }}>
          <b style={{ color: "var(--brand-t)" }}>Privacidade:</b> neste grupo, todos veem o nome da meta, o total e quanto cada participante guardou. Renda, gastos e categorias pessoais não são compartilhados. O PayPilot não movimenta dinheiro.
        </div>
        {(!isOwner || hasFeature(plan, "metas_grupo")) ? <>
          <RegistrarValorGuardado key={`record-${g.id}`} goalId={g.id} goalName={g.name} saved={members.find((member) => member.isMe)?.saved ?? 0} />
          <HistoricoMeta key={`history-${g.id}`} goalId={g.id} />
        </> : <Paywall need="pilot" headline="Continue acompanhando sua meta em grupo" detail="O proprietário precisa do plano Pilot para registrar valores e consultar o histórico da meta em grupo." />}
      </section>
      <div style={{ display: "grid", gridTemplateColumns: bp === "desktop" ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17 }}>Participantes</div>
            <div style={{ color: "var(--ink3)", fontSize: 13, marginTop: 3 }}>Apenas os valores guardados para esta meta aparecem aqui.</div>
          </div>
          {members.map((member, index) => (
            <div key={member.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 13, borderRadius: 15, border: "1px solid var(--line)" }}>
              <span style={{ width: 42, height: 42, borderRadius: "50%", background: index === 0 ? "var(--brand-soft)" : "var(--accent-soft)", color: index === 0 ? "var(--brand-t)" : "var(--accent-t)", display: "grid", placeItems: "center", fontWeight: 900, flex: "none" }}>{member.name.slice(0, 2).toLocaleUpperCase("pt-BR")}</span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 800 }}>{member.isMe ? `${member.name} (você)` : member.name}</span>
              <b>{brl(member.saved)}</b>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.45 }}>Não mostramos renda nem estimamos uma divisão proporcional. Cada pessoa combina diretamente quanto pretende guardar.</div>
        </section>
        {isOwner && hasFeature(plan, "metas_grupo") ? (
          <InviteGoal key={g.id} goalId={g.id} goalName={g.name} />
        ) : (
          <section style={{ ...card(22, 18), display: "flex", gap: 10, alignItems: "flex-start", color: "var(--ink2)", fontSize: 14, lineHeight: 1.5 }}>
            <I name="lock" style={{ color: "var(--brand-t)" }} />
            <span>Somente quem criou a meta pode alterar os detalhes ou convidar participantes. Você pode registrar e corrigir seus próprios valores no histórico.</span>
          </section>
        )}
      </div>
    </>
  );
}
