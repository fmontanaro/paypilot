// Metas (Metas.dc.html): lista, criar meta (valor mensal, de onde tirar, trade-off) e meta em grupo.
import { useState } from "react";
import { goalCalc, goalView, groupShares, moneySources, type Context } from "@shared/engine";
import { brl, monthShort, monthYear, parseMoney } from "@shared/format";
import { hasFeature } from "@shared/plans";
import { api, useAction, useCtx } from "@/lib/api";
import { useApp } from "@/lib/app";
import { Bar, btnPrimary, card, I, input, labelCol, nunito, Paywall, PillTabs, Segmented } from "@/ui";
import { RegistrarValorGuardado } from "./metas/RegistrarValorGuardado";

const TABS = [
  { id: "lista", label: "Minhas metas", icon: "flag" },
  { id: "criar", label: "Criar meta", icon: "add" },
  { id: "grupo", label: "Meta em grupo", icon: "group" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const ICONS = ["laptop_mac", "flight", "directions_car", "school", "home", "celebration", "medical_services", "savings"];

export default function Metas() {
  const { sub, go, plan } = useApp();
  const tab = (TABS.some((t) => t.id === sub) ? sub : "lista") as Tab;
  const { ctx } = useCtx();
  if (!ctx) return null;
  const goals = ctx.data.goals.map((g) => goalView(g, ctx.data.goalMembers, ctx.today));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PillTabs label="Metas" tabs={TABS as unknown as { id: Tab; label: string; icon: string }[]} value={tab} onChange={(id) => go("metas", id)} />
      {!hasFeature(plan, "metas") ? (
        <Paywall need="plus" headline={goals[0] ? `Sua meta “${goals[0].name}” cabe com ${brl(goals[0].monthly)} por mês` : "Planeje suas metas sem atrasar a saída das dívidas"} detail="Mostramos de onde tirar o dinheiro e quanto isso mexe no seu plano." teaser={goals.slice(0, 3).map((g) => ({ a: g.name, b: brl(g.target) }))} />
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
                  {(!g.isGroup || hasFeature(plan, "metas_grupo")) && <RegistrarValorGuardado goalId={g.id} goalName={g.name} saved={g.saved} />}
                  {g.isGroup && (
                    <button onClick={() => go("metas", "grupo")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800 }}>
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
      ) : !hasFeature(plan, "metas_grupo") ? (
        <Paywall need="pilot" headline="Meta do casal ou da família, dividida do jeito de vocês" detail="Cada pessoa escolhe o que compartilha. Ninguém vê o que não foi liberado." />
      ) : (
        <Grupo ctx={ctx} />
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

function Grupo({ ctx }: { ctx: Context }) {
  const { bp } = useApp();
  const g = ctx.data.goals.find((x) => x.isGroup);
  const [invite, setInvite] = useState("");
  const [invited, setInvited] = useState("");
  const patch = useAction((b: Record<string, unknown>) => api("PATCH", `/api/goals/${g!.id}`, b));
  const inv = useAction((contact: string) => api("POST", `/api/goals/${g!.id}/invites`, { contact }), { onDone: (_r, c) => (setInvited(c), setInvite("")) });
  if (!g) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Você ainda não tem meta em grupo. Crie uma meta e convide quem vai dividir com você.</div>;
  const v = goalView(g, ctx.data.goalMembers, ctx.today);
  const members = ctx.data.goalMembers.filter((m) => m.goalId === g.id).sort((a, b) => Number(b.isMe) - Number(a.isMe));
  const shares = groupShares(members, (g.target - v.saved) / Math.max(1, g.months - 1) || v.monthly, g.splitMode as "igual" | "prop");
  const COLORS = ["var(--brand)", "var(--accent)", "var(--warn)", "var(--good)"];
  const other = members.find((m) => !m.isMe);
  return (
    <>
      <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I name={g.icon} />
          </span>
          <div>
            <div style={nunito(22)}>{g.name}</div>
            <div style={{ fontSize: 14, color: "var(--ink2)" }}>
              {brl(g.target)} em {g.months} meses · até {monthYear(v.until)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 24, fontWeight: 900 }}>{brl(v.saved)}</span>
          <span style={{ color: "var(--ink3)" }}>
            {Math.round(v.pct * 100)}% de {brl(g.target)}
          </span>
        </div>
        <div role="img" aria-label={`${brl(v.saved)} de ${brl(g.target)}; ${members.map((m) => `${m.name} ${brl(m.saved)}`).join(", ")}`} style={{ display: "flex", height: 14, borderRadius: 7, background: "var(--surface2)", overflow: "hidden" }}>
          {members.map((m, k) => (
            <div key={m.id} style={{ width: `${(m.saved / g.target) * 100}%`, background: COLORS[k % COLORS.length] }} />
          ))}
        </div>
        <RegistrarValorGuardado goalId={g.id} goalName={g.name} saved={v.saved} />
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--ink2)" }}>
          {members.map((m, k) => (
            <span key={m.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[k % COLORS.length] }} />
              {m.name}
            </span>
          ))}
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: bp === "desktop" ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontWeight: 800 }}>Como dividir</div>
          <Segmented
            role="radiogroup"
            h={48}
            options={[
              { id: "igual", label: "Igual" },
              { id: "prop", label: "Proporcional à renda" },
            ]}
            value={g.splitMode as "igual" | "prop"}
            onChange={(splitMode) => patch.mutate({ splitMode })}
          />
          {members.map((m, k) => {
            const sh = shares.find((s) => s.id === m.id)!;
            const ini = m.name.slice(0, 2).toUpperCase();
            return (
              <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 16, border: "1px solid var(--line)" }}>
                <span style={{ width: 44, height: 44, borderRadius: "50%", background: k === 0 ? "var(--brand-soft)" : "var(--accent-soft)", color: k === 0 ? "var(--brand-t)" : "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "none" }}>{ini}</span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b>{m.isMe ? `${m.name} (você)` : m.name}</b>
                    <b>{brl(sh.share)}/mês</b>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink3)" }}>
                    {Math.round(sh.pct * 100)}%{g.splitMode === "prop" ? " (proporcional à renda)" : ""} · já guardou {brl(m.saved)}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink2)", display: "flex", gap: 6, alignItems: "center" }}>
                    <I name="visibility" size={16} />
                    {m.isMe ? (g.myPrivacy === "contrib" ? "Você compartilha só a contribuição" : "Você compartilha contribuição e totais por categoria") : `${m.name} compartilha ${m.privacy === "cats" ? "contribuição e totais por categoria" : "só a contribuição"}`}
                  </div>
                  {!m.isMe && m.privacy !== "cats" && (
                    <div style={{ marginTop: 4, padding: 10, borderRadius: 12, background: "var(--surface2)", fontSize: 13, color: "var(--ink3)", display: "flex", gap: 6, alignItems: "center" }}>
                      <I name="lock" size={16} />
                      Totais por categoria não compartilhados
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: "var(--ink3)" }}>Na divisão proporcional usamos a renda que cada um informou, sem mostrar o valor para a outra pessoa.</div>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>O que você compartilha</div>
            {(
              [
                ["contrib", "Só a minha contribuição", `${other?.name || "A outra pessoa"} vê quanto você guardou para a meta. Nada mais.`],
                ["cats", "Também totais por categoria", "Ela vê, por exemplo, quanto foi para restaurantes no mês — nunca as transações."],
              ] as const
            ).map(([id, t, d]) => {
              const sel = g.myPrivacy === id;
              return (
                <button key={id} role="radio" aria-checked={sel} onClick={() => patch.mutate({ myPrivacy: id })} style={{ textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 16, border: `2px solid ${sel ? "var(--brand-t)" : "var(--line)"}`, background: "var(--surface)", minHeight: 56 }}>
                  <I name={sel ? "radio_button_checked" : "radio_button_unchecked"} style={{ color: sel ? "var(--brand-t)" : "var(--ink3)" }} />
                  <span>
                    <span style={{ display: "block", fontWeight: 800 }}>{t}</span>
                    <span style={{ display: "block", fontSize: 13, color: "var(--ink2)" }}>{d}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 10 }}>
            <label htmlFor="inv" style={{ fontWeight: 800 }}>
              Convidar participante
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input id="inv" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="E-mail ou celular" style={input(48, { flex: "1 1 180px", fontWeight: 500 })} />
              <button onClick={() => invite.trim() && inv.mutate(invite.trim())} style={btnPrimary(48, { borderRadius: 12, padding: "0 16px" })}>
                Convidar
              </button>
            </div>
            {invited && (
              <div style={{ fontSize: 13, color: "var(--good-t)", fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
                <I name="mark_email_read" size={16} />
                Convite registrado para {invited}
              </div>
            )}
            {inv.error && <div style={{ fontSize: 13, color: "var(--risk-t)", fontWeight: 700 }}>{(inv.error as Error).message}</div>}
          </div>
        </section>
      </div>
    </>
  );
}
