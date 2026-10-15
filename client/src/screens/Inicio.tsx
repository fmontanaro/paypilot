// Início (Inicio.dc.html): resumo do mês, o que fazer agora, tetos em risco, progresso do plano
// e próximos vencimentos. Estados: carregando, vazio e erro com ação.
import { useState, type CSSProperties } from "react";
import { category } from "@shared/categories";
import { actions, ceilingsAtRisk, PHASE_DESC, planProgress, suggestions, upcoming, upcomingLabel } from "@shared/engine";
import { brl, daysInMonth, monthLong, monthShort, weekday } from "@shared/format";
import { api, useAction, useCtx } from "@/lib/api";
import { useApp } from "@/lib/app";
import { Bar, btnPrimary, btnSecondary, card, ErrorNote, h2, I, LOGO_BG, MarkerLegend, nunito, Skeleton, TONE } from "@/ui";

export default function Inicio() {
  const { bp, go } = useApp();
  const { ctx, isLoading, isError, refetch } = useCtx();
  const [retrying, setRetrying] = useState(false);
  const sync = useAction((id: string) => api("POST", `/api/connections/${id}/sync`));

  const span = (d: number, t: number, m = 12) => (bp === "desktop" ? d : bp === "tablet" ? t : m);
  const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 16, alignItems: "start" };

  if (isLoading || retrying || !ctx) {
    if (isError)
      return <ErrorNote title="Não conseguimos carregar seu mês" text="Pode ser a conexão. Seus dados estão seguros." action="Tentar de novo" onAction={() => void refetch()} />;
    return (
      <div aria-busy="true" aria-label="Carregando seu mês" style={grid}>
        <Skeleton span={span(7, 12)} h={360} />
        <Skeleton span={span(5, 12)} h={360} />
        <Skeleton span={span(6, 6)} h={240} />
        <Skeleton span={span(6, 6)} h={240} />
      </div>
    );
  }

  if (!ctx.hasData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "48px 20px", borderRadius: 24, background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div style={{ width: 120, height: 120, borderRadius: 32, background: LOGO_BG("50% 20%/150%") }} />
        <h2 style={{ margin: "6px 0 0", ...nunito(24, 800) }}>Seu mês aparece aqui</h2>
        <p style={{ margin: 0, maxWidth: 380, color: "var(--ink2)", lineHeight: 1.5, textWrap: "pretty" } as CSSProperties}>Conecte um banco ou envie um extrato. Em poucos minutos mostramos para onde o dinheiro vai — sem julgamento.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => go("onb", "banco")} style={btnPrimary(48)}>
            Conectar via Open Finance
          </button>
          <button onClick={() => go("onb", "upload")} style={btnSecondary(48)}>
            Enviar extratos
          </button>
        </div>
      </div>
    );
  }

  const { today, summary: s } = ctx;
  const dim = daysInMonth(today);
  const day = today.getDate();
  const mes = monthLong(today.getMonth());
  const sugs = suggestions(ctx.items, today);
  const hole0 = Math.max(0, s.planned - s.income);
  const coveredPct = hole0 ? Math.min(1, s.covered / hole0) : 0;
  const mx = Math.max(s.income, s.monthTotal, 1);
  const acts = actions(ctx);
  const risk = ceilingsAtRisk(ctx.ceilings);
  const prog = planProgress(ctx);
  const venc = upcoming(ctx);
  const vencTotal = venc.reduce((a, v) => a + v.amount, 0);
  const lastDay = new Date(today.getFullYear(), today.getMonth(), day + 13);
  const maxDay = Math.max(1, ...venc.map((v) => v.amount));
  const failed = ctx.data.connections.find((c) => c.status === "erro");

  const strip = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), day + i);
    const evs = venc.filter((v) => v.date.getTime() === d.getTime());
    const tot = evs.reduce((a, v) => a + v.amount, 0);
    return { d, tot, ev: evs.length > 0, i };
  });
  const biggest = [...venc].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {failed && (
        <ErrorNote
          title={`Não conseguimos atualizar o ${failed.institution === "XP" ? "cartão XP" : failed.institution}`}
          text="Os números abaixo podem estar até 2 dias atrasados. Seus dados estão seguros."
          action="Tentar de novo"
          onAction={() => {
            setRetrying(true);
            sync.mutate(failed.id, { onSettled: () => setRetrying(false) });
          }}
        />
      )}
      <div style={grid}>
        <section aria-labelledby="h-resumo" style={{ gridColumn: `span ${span(7, 12)}`, ...card(24, 22), display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 id="h-resumo" style={h2}>
              Resumo de {mes}
            </h2>
            <span style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 600 }}>
              Dia {day} de {dim}
            </span>
          </div>
          <Bar pct={day / dim} h={6} color="var(--ink3)" aria={`${Math.round((day / dim) * 100)}% do mês já passou`} />
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: s.fits ? "var(--good-soft)" : "var(--warn-soft)", color: s.fits ? "var(--good-t)" : "var(--warn-t)", fontSize: 13, fontWeight: 800 }}>
              <I name={s.fits ? "check_circle" : "info"} size={18} />
              {s.fits ? "Cabe na renda" : "Ainda não fecha"}
            </div>
            <div style={{ marginTop: 10, ...nunito(bp === "mobile" ? 40 : bp === "desktop" ? 44 : 52), lineHeight: 1.05, letterSpacing: "-.02em", whiteSpace: bp === "mobile" ? "normal" : "nowrap" }}>{s.fits ? `Sobram ${brl(s.diff)}` : `Faltam ${brl(-s.diff)}`}</div>
            <div style={{ fontSize: 17, color: "var(--ink2)", marginTop: 4, fontWeight: 600 }}>
              {s.fits ? `em ${mes}, pelo seu plano.` : sugs.length ? `para fechar ${mes}. Veja ${sugs.length} forma${sugs.length > 1 ? "s" : ""} de cobrir.` : `para fechar ${mes}.`}
            </div>
          </div>
          {hole0 > 0 && s.covered > 0 && (
            <div style={{ padding: 14, borderRadius: 16, background: "var(--good-soft)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 14 }}>
                <span style={{ fontWeight: 800, color: "var(--good-t)", display: "flex", alignItems: "center", gap: 6 }}>
                  <I name="trending_down" size={18} />O buraco já diminuiu
                </span>
                <span style={{ color: "var(--ink2)" }}>era {brl(hole0)} no dia 1º</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Bar pct={coveredPct} h={10} track="var(--surface)" color="var(--good)" aria={`Você já cobriu ${brl(s.covered)} de ${brl(hole0)}, ${Math.round(coveredPct * 100)}%`} />
              </div>
              <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 6 }}>Você já cobriu {brl(s.covered)} cortando, adiando e parcelando.</div>
            </div>
          )}
          <div role="img" aria-label={`Renda prevista ${brl(s.income)} contra compromissos de ${brl(s.monthTotal)}`} style={{ display: "grid", gap: 10 }}>
            {[
              ["Renda prevista", s.income, "var(--brand)"],
              ["Compromissos", s.monthTotal, "var(--accent)"],
            ].map(([k, v, c]) => (
              <div key={k as string} style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr) auto", gap: 10, alignItems: "center", fontSize: 14 }}>
                <span style={{ color: "var(--ink2)" }}>{k}</span>
                <div style={{ height: 12, borderRadius: 6, background: "var(--surface2)" }}>
                  <div style={{ width: `${((v as number) / mx) * 100}%`, height: "100%", borderRadius: 6, background: c as string }} />
                </div>
                <b>{brl(v as number)}</b>
              </div>
            ))}
            {s.covered > 0 && <div style={{ fontSize: 12, color: "var(--ink3)" }}>De {brl(s.planned)} previstos, {brl(s.covered)} já foram cortados, adiados ou parcelados.</div>}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => go("plano", "prioridades")} style={btnPrimary(50, { flex: "1 1 200px" })}>
              {s.fits || !sugs.length ? "Ver prioridades do mês" : `Ver ${sugs.length} forma${sugs.length > 1 ? "s" : ""} de cobrir`}
              <I name="arrow_forward" size={20} />
            </button>
            <button onClick={() => go("assistente")} style={btnSecondary(50, { flex: "1 1 160px" })}>
              Perguntar ao assistente
            </button>
          </div>
        </section>

        <section aria-labelledby="h-agora" style={{ gridColumn: `span ${span(5, 12)}`, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 id="h-agora" style={{ ...h2, margin: "4px 4px 0" }}>
            O que fazer agora
          </h2>
          {acts.length === 0 && <div style={{ ...card(20, 16), color: "var(--ink2)", fontSize: 14 }}>Nada urgente hoje. Seu mês está sob controle.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
            {acts.map((a) => (
              <article key={a.kind} style={{ ...card(20, 16), display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 44, height: 44, borderRadius: 14, background: TONE[a.tone].bg, color: TONE[a.tone].fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <I name={a.icon} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: TONE[a.tone].fg, textTransform: "uppercase", letterSpacing: ".05em" }}>{a.tag}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3, marginTop: 2, textWrap: "pretty" } as CSSProperties}>{a.title}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.45 }}>{a.meta}</div>
                <button onClick={() => go(a.to[0], a.to[1])} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: 0, background: "var(--surface2)", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  {a.cta}
                  <I name="chevron_right" size={18} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-tetos" style={{ gridColumn: `span ${span(6, 6)}`, ...card(24, 20), display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 id="h-tetos" style={h2}>
              Tetos em risco
            </h2>
            <button onClick={() => go("gastos", "tetos")} style={{ minHeight: 44, border: 0, background: "none", color: "var(--brand-t)", fontWeight: 800, fontSize: 14 }}>
              Ver todos
            </button>
          </div>
          {risk.length === 0 && <div style={{ fontSize: 14, color: "var(--ink2)" }}>{ctx.ceilings.length ? "Todos os tetos estão no ritmo." : "Crie tetos para saber no meio do mês como ele vai fechar."}</div>}
          {risk.map((t) => (
            <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                  <I name={category(t.categoryId).icon} size={20} style={{ color: "var(--ink3)" }} />
                  {t.label}
                </span>
                <span style={{ fontSize: 14 }}>
                  <b>{brl(t.spent)}</b> <span style={{ color: "var(--ink3)" }}>de {brl(t.limit)}</span>
                </span>
              </div>
              <Bar pct={t.pct} color="var(--warn)" marker={t.expectedPace} aria={`${t.label}: ${brl(t.spent)} de ${brl(t.limit)}, ${Math.round(t.pct * 100)}% usado. Projeção ${brl(t.projection)}.`} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--warn-t)", fontWeight: 700 }}>
                <I name="trending_up" size={16} />
                No ritmo atual: {brl(t.projection)} até o dia {dim}
              </div>
            </div>
          ))}
          {risk.length > 0 && <MarkerLegend text={`Marcador = ritmo esperado para o dia ${day}`} />}
        </section>

        <section aria-labelledby="h-plano" style={{ gridColumn: `span ${span(6, 6)}`, ...card(24, 20), display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 id="h-plano" style={h2}>
              Progresso do plano
            </h2>
            <button onClick={() => go("plano", "quitacao")} style={{ minHeight: 44, border: 0, background: "none", color: "var(--brand-t)", fontWeight: 800, fontSize: 14 }}>
              Ver plano
            </button>
          </div>
          <ol aria-label={`Jornada em 4 fases, fase atual: ${ctx.phases.find((p) => p.current)?.label}`} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
            {ctx.phases.map((f) => (
              <li key={f.n} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 4 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, background: f.current ? "var(--brand)" : f.n < ctx.phase ? "var(--brand-soft)" : "var(--surface)", color: f.current ? "var(--brand-on)" : f.n < ctx.phase ? "var(--brand-t)" : "var(--ink3)", border: `2px solid ${f.current || f.n < ctx.phase ? "var(--brand)" : "var(--line)"}` }}>{f.n}</span>
                  <span style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--line)" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: f.current ? 800 : 600, lineHeight: 1.25, color: f.current ? "var(--ink)" : "var(--ink3)" }}>{f.label}</span>
              </li>
            ))}
          </ol>
          <div style={{ padding: 14, borderRadius: 16, background: "var(--brand-soft)" }}>
            <div style={{ fontWeight: 800, color: "var(--brand-t)" }}>
              Fase {ctx.phase} · {ctx.phases[ctx.phase - 1].label}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink2)", marginTop: 4, lineHeight: 1.45 }}>{PHASE_DESC[ctx.phase - 1].replace("{mes}", mes)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--ink3)" }}>Dívida total</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{brl(prog.totalDebt)}</div>
              {prog.debtDelta != null && prog.debtDelta < 0 && (
                <div style={{ fontSize: 13, color: "var(--good-t)", fontWeight: 700, display: "flex", gap: 4, alignItems: "center" }}>
                  <I name="south" size={16} />
                  {brl(-prog.debtDelta)} desde {prog.prevMonthLabel}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--ink3)" }}>{prog.totalDebt > 0 ? "Quitação prevista" : "Dívidas com juros"}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{prog.totalDebt > 0 ? prog.payoffLabel : "Nenhuma"}</div>
              {prog.earlierMonths > 0 && (
                <div style={{ fontSize: 13, color: "var(--good-t)", fontWeight: 700, display: "flex", gap: 4, alignItems: "center" }}>
                  <I name="event_available" size={16} />
                  {prog.earlierMonths} {prog.earlierMonths === 1 ? "mês" : "meses"} antes
                </div>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="h-venc" style={{ gridColumn: "span 12", ...card(24, 20), display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 id="h-venc" style={h2}>
              Próximos vencimentos · 14 dias
            </h2>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>
              {brl(vencTotal)} até {lastDay.getDate()} {monthShort(lastDay.getMonth())}
            </span>
          </div>
          <div role="img" aria-label={`Linha do tempo de ${day} ${monthShort(today.getMonth())} a ${lastDay.getDate()} ${monthShort(lastDay.getMonth())}.${biggest ? ` Maior vencimento: ${biggest.name} de ${brl(biggest.amount)}.` : ""}`} style={{ display: "grid", gridTemplateColumns: "repeat(14,minmax(0,1fr))", gap: 3, alignItems: "end" }}>
            {strip.map((x) => (
              <div key={x.i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ height: 56, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div style={{ width: "min(14px,70%)", height: x.tot ? Math.max(6, Math.round((x.tot / maxDay) * 52)) : x.ev ? 4 : 0, borderRadius: 4, background: x.i === 0 ? "var(--risk)" : x.i <= 3 ? "var(--warn)" : "var(--brand)" }} />
                </div>
                <span style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 700 }}>{weekday(x.d)[0]}</span>
                <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: x.i === 0 ? "var(--ink)" : "transparent", color: x.i === 0 ? "var(--bg)" : "var(--ink2)" }}>{x.d.getDate()}</span>
              </div>
            ))}
          </div>
          {venc.length === 0 && <div style={{ fontSize: 14, color: "var(--ink2)" }}>Nada vence nos próximos 14 dias.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "4px 20px" }}>
            {venc.map((v, k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderBottom: "1px solid var(--line)" }}>
                <span style={{ width: 44, flex: "none", textAlign: "center", fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>{upcomingLabel(v, today)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                  {v.tag && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: v.tone === "risk" ? "var(--risk-t)" : v.tone === "warn" ? "var(--warn-t)" : "var(--ink3)" }}>
                      <I name={v.icon} size={14} />
                      {v.tag}
                    </span>
                  )}
                </div>
                <span style={{ fontWeight: 800 }}>{v.amount ? brl(v.amount) : "—"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
