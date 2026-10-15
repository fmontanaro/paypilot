// Plano (Plano.dc.html): Prioridades do mês, Mapa de crédito, Otimizador de rolagem,
// Plano de quitação e Renegociação. Todo número vem do motor financeiro.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Account, Section } from "@shared/schema";
import { bankOf } from "@shared/banks";
import {
  type Context,
  impact,
  itemNote,
  manualStatement,
  moveOptions,
  renegotiate,
  rolloverHistory,
  rolloverTrend,
  routeCostLabel,
  routes as buildRoutes,
  SECTION_LABEL,
  SECTIONS,
  suggestions,
  summarize,
  withSection,
  type PriorityItem,
} from "@shared/engine";
import { brl, monthLong, monthShort, monthYear, pct, rateLabel } from "@shared/format";
import { hasFeature } from "@shared/plans";
import { api, useCtx } from "@/lib/api";
import { useApp } from "@/lib/app";
import { Bar, btnPrimary, card, CloseBtn, h2, I, MarkerLegend, nunito, Paywall, PillTabs, Sheet, TONE } from "@/ui";
import { useQueryClient } from "@tanstack/react-query";

const TABS = [
  { id: "prioridades", label: "Prioridades do mês", icon: "checklist" },
  { id: "credito", label: "Mapa de crédito", icon: "credit_card" },
  { id: "rolagem", label: "Otimizador de rolagem", icon: "alt_route" },
  { id: "quitacao", label: "Plano de quitação", icon: "flag_circle" },
  { id: "renegociacao", label: "Renegociação", icon: "handshake" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Plano() {
  const { sub, go, plan } = useApp();
  const tab = (TABS.some((t) => t.id === sub) ? sub : "prioridades") as Tab;
  const [local, setLocal] = useState<Record<string, Section>>({});
  const { ctx } = useCtx(local);
  if (!ctx) return null;
  const featureOf: Record<Tab, Parameters<typeof hasFeature>[1]> = { prioridades: "prioridades", credito: "credito", rolagem: "rolagem", quitacao: "quitacao", renegociacao: "renegociacao" };
  const locked = !hasFeature(plan, featureOf[tab]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PillTabs label="Seções do plano" tabs={TABS as unknown as { id: Tab; label: string; icon: string }[]} value={tab} onChange={(id) => go("plano", id)} />
      {locked ? (
        <PlanoPaywall tab={tab} ctx={ctx} />
      ) : tab === "prioridades" ? (
        <Prioridades ctx={ctx} local={local} setLocal={setLocal} />
      ) : tab === "credito" ? (
        <Credito ctx={ctx} />
      ) : tab === "rolagem" ? (
        <Rolagem ctx={ctx} />
      ) : tab === "quitacao" ? (
        <Quitacao ctx={ctx} />
      ) : (
        <Renegociacao ctx={ctx} />
      )}
    </div>
  );
}

function PlanoPaywall({ tab, ctx }: { tab: Tab; ctx: Context }) {
  const mes = monthLong(ctx.today.getMonth());
  const sugs = suggestions(ctx.items, ctx.today);
  const credit = ctx.data.accounts.filter((a) => a.kind !== "conta");
  const maxRate = Math.max(0, ...credit.map((a) => a.monthlyRate ?? 0));
  const fat = ctx.items.find((i) => i.commitment.kind === "fatura" && !i.paid);
  const rts = fat ? buildRoutes(fat.commitment, ctx.data.accounts, ctx.data.incomes, ctx.today) : [];
  const best = rts.find((r) => r.best);
  const rot = ctx.debts.find((d) => d.kind !== "pessoal");
  const ren = rot ? renegotiate(rot, 12) : null;
  const P: Record<Tab, [string, string]> = {
    prioridades: [ctx.summary.fits ? `Seu ${mes} já cabe na renda` : `Seu ${mes} pode caber na renda com ${sugs.length || 3} movimentos`, ctx.summary.fits ? "Veja o que pagar agora, o que parcelar e o custo de cada escolha." : `Hoje faltam ${brl(-ctx.summary.diff)}. Mostramos o que pagar agora, o que parcelar e o custo de cada escolha.`],
    credito: [`Você tem ${credit.length} fontes de crédito, com custo de 0% a ${pct(maxRate)} ao mês`, "Veja limites, datas e taxas lado a lado antes de decidir."],
    rolagem: [rts.length ? `Encontramos ${rts.length} rotas para pagar a ${fat!.name.toLowerCase()}` : "Compare rotas antes de rolar uma fatura", best ? `A melhor custa ${brl(best.cost)} e termina num prazo definido, sem empurrar a conta.` : "Mostramos o custo de cada manobra e a saída."],
    quitacao: [ctx.payoff.debtFree ? `Dá para quitar ${brl(ctx.payoff.totalDebt)} em dívidas até ${monthYear(ctx.payoff.debtFree)}` : "Monte seu plano de quitação", `Atacando da mais cara para a mais barata, você paga ${brl(ctx.payoff.savingsVsMin)} a menos em juros.`],
    renegociacao: [ren && rot ? `Uma proposta de ${brl(ren.range[0])} a ${brl(ren.range[1])} pode encerrar o ${rot.name.replace(/^Rotativo/, "rotativo do")}` : "Simule uma renegociação", "Simule parcela e prazo antes de ligar para o banco."],
  };
  const teaser = tab === "rolagem" && rts.length ? rts.map((r) => ({ a: `Rota ${r.letter}`, b: routeCostLabel(r).replace(" agora", "") })) : undefined;
  return <Paywall need="pilot" headline={P[tab][0]} detail={P[tab][1]} teaser={teaser} />;
}

// ---------------- Prioridades do mês ----------------
function Prioridades({ ctx, local, setLocal }: { ctx: Context; local: Record<string, Section>; setLocal: (f: (s: Record<string, Section>) => Record<string, Section>) => void }) {
  const { bp, toast } = useApp();
  const qc = useQueryClient();
  const isM = bp === "mobile";
  const [mTab, setMTab] = useState<Section>("pagar");
  const [moveId, setMoveId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const items = ctx.items;
  const s = ctx.summary;
  const mx = Math.max(s.income, s.monthTotal, 1);
  const sugs = suggestions(items, ctx.today);
  const mes = monthLong(ctx.today.getMonth());

  const move = (id: string, to: Section) => {
    const it = items.find((x) => x.id === id);
    setMoveId(null);
    setDragId(null);
    if (!it || !it.allowed.includes(to) || it.section === to) return;
    const next = summarize(withSection(items, id, to), s.income);
    setLocal((cur) => ({ ...cur, [id]: to }));
    toast(`${it.name} → ${SECTION_LABEL[to]}. ${next.fits ? "Agora cabe: sobram " + brl(next.diff) : "Agora faltam " + brl(-next.diff)}`);
    void api("PUT", `/api/priorities/${id}`, { section: to }).then(() => qc.invalidateQueries({ queryKey: ["snapshot"] }));
  };

  const secs = SECTIONS.map((sec) => {
    const its = items.filter((it) => it.section === sec.id);
    const tot = its.reduce((a, it) => a + (sec.id === "parcelar" ? impact(it) : it.amount), 0);
    const dragIt = items.find((x) => x.id === dragId);
    const can = !!dragIt && dragIt.allowed.includes(sec.id) && dragIt.section !== sec.id;
    return { ...sec, its, tot, can, totalTxt: sec.id === "parcelar" ? `${brl(tot)} no mês` : sec.id === "pagar" ? brl(tot) : `${brl(tot)} fora do mês` };
  });
  const mvIt = items.find((x) => x.id === moveId) || null;

  return (
    <>
      <section aria-label="Resumo do mês" style={{ position: isM ? "sticky" : "static", top: isM ? "calc(68px + env(safe-area-inset-top))" : "auto", zIndex: 30, ...card(22, 18), display: "flex", flexDirection: "column", gap: 12, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 700 }}>Prioridades de {mes}</div>
            <div aria-live="polite" style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4, ...nunito(26), lineHeight: 1.15, color: s.fits ? "var(--good-t)" : "var(--warn-t)" }}>
              <I name={s.fits ? "check_circle" : "info"} size={26} style={{ marginTop: 2 }} />
              {s.fits ? `Cabe: sobram ${brl(s.diff)}` : `Não cabe: faltam ${brl(-s.diff)}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 14, flexWrap: "wrap" }}>
            {[
              ["Renda prevista", brl(s.income)],
              ["A pagar no mês", brl(s.monthTotal)],
              ["Custo das escolhas", brl(s.cost)],
            ].map(([k, v]) => (
              <div key={k} style={{ whiteSpace: "nowrap" }}>
                <div style={{ color: "var(--ink3)", fontSize: 12 }}>{k}</div>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
        <div role="img" aria-label={`A pagar ${brl(s.monthTotal)} contra renda de ${brl(s.income)}. ${s.fits ? "Cabe" : "Não cabe"}.`} style={{ position: "relative", height: 14, borderRadius: 7, background: "var(--surface2)" }}>
          <div style={{ width: `${(s.monthTotal / mx) * 100}%`, height: "100%", borderRadius: 7, background: s.fits ? "var(--good)" : "var(--warn)", transition: "width .35s ease" }} />
          <div style={{ position: "absolute", left: `${(s.income / mx) * 100}%`, top: -5, bottom: -5, width: 3, borderRadius: 2, background: "var(--ink)" }} />
        </div>
        <MarkerLegend text="Marcador = sua renda do mês" />
      </section>

      {sugs.length > 0 && (
        <section aria-labelledby="h-sug" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="h-sug" style={{ ...h2, margin: "4px 4px 0" }}>
            {s.fits ? "Mais formas de aliviar o mês" : `${sugs.length} forma${sugs.length > 1 ? "s" : ""} de cobrir`}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            {sugs.map((g) => (
              <button key={g.id} onClick={() => move(g.id, g.to)} style={{ textAlign: "left", padding: 14, borderRadius: 18, border: "1px dashed var(--brand-t)", background: "var(--brand-soft)", display: "flex", gap: 10, alignItems: "flex-start", minHeight: 44 }}>
                <I name="add_task" style={{ color: "var(--brand-t)" }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{g.title}</span>
                  <span style={{ fontSize: 13, color: "var(--ink2)" }}>{g.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && <div style={{ ...card(20, 18), color: "var(--ink2)" }}>Ainda não há compromissos do mês. Eles aparecem quando você conecta um banco ou envia extratos.</div>}

      {isM ? (
        <>
          <div role="tablist" aria-label="Seções de prioridade" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, padding: 4, borderRadius: 16, background: "var(--surface2)" }}>
            {secs.map((sec) => (
              <button key={sec.id} role="tab" aria-selected={mTab === sec.id} onClick={() => setMTab(sec.id)} style={{ minHeight: 56, border: 0, borderRadius: 12, background: mTab === sec.id ? "var(--surface)" : "transparent", boxShadow: mTab === sec.id ? "var(--shadow)" : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "4px 2px" }}>
                <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.15, textAlign: "center" }}>{sec.short}</span>
                <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 700 }}>{sec.its.length} itens</span>
              </button>
            ))}
          </div>
          {secs
            .filter((sec) => sec.id === mTab)
            .map((sec) => (
              <div key={sec.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                  <SectionBadge id={sec.id} />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{sec.totalTxt}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink3)", padding: "0 4px" }}>{sec.desc}</div>
                {sec.its.map((it) => {
                  const n = itemNote(it);
                  return (
                    <article key={it.id} style={{ ...card(18, 14), display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{it.name}</span>
                          <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{amtTxt(it)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{it.due}</div>
                        <div style={{ fontSize: 13, color: TONE[n.tone].fg, marginTop: 4, fontWeight: 700, display: "flex", gap: 4, alignItems: "flex-start" }}>
                          <I name={n.icon} size={16} />
                          <span>{n.text}</span>
                        </div>
                      </div>
                      {it.allowed.length > 1 && (
                        <button onClick={() => setMoveId(it.id)} aria-label={`Mover ${it.name}`} style={{ flex: "none", minWidth: 44, minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 800, fontSize: 13, padding: "0 10px" }}>
                          <I name="swap_vert" size={20} />
                          Mover
                        </button>
                      )}
                    </article>
                  );
                })}
                {!sec.its.length && <div style={{ padding: 24, textAlign: "center", color: "var(--ink3)", border: "1px dashed var(--line)", borderRadius: 18 }}>Nada aqui. Mova itens das outras seções.</div>}
              </div>
            ))}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: bp === "desktop" ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", gap: 12, alignItems: "start" }}>
            {secs.map((sec) => (
              <section
                key={sec.id}
                aria-label={sec.label}
                onDragOver={(e) => {
                  if (sec.can) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) move(dragId, sec.id);
                }}
                style={{ minWidth: 0, background: sec.can ? "var(--brand-soft)" : "var(--surface2)", border: `2px dashed ${sec.can ? "var(--brand-t)" : "transparent"}`, borderRadius: 20, padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 240 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "2px 4px 6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <SectionBadge id={sec.id} />
                    <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 700 }}>{sec.its.length}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{sec.totalTxt}</div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>{sec.desc}</div>
                </div>
                {sec.its.map((it) => {
                  const n = itemNote(it);
                  const mov = it.allowed.length > 1;
                  return (
                    <article
                      key={it.id}
                      draggable={mov}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", it.id);
                        setDragId(it.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      style={{ minWidth: 0, overflowWrap: "anywhere", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 4, cursor: mov ? "grab" : "default", opacity: dragId === it.id ? 0.4 : 1 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3, minWidth: 0 }}>{it.name}</span>
                        {mov && (
                          <button onClick={() => setMoveId(it.id)} aria-label={`Mover ${it.name}`} style={{ flex: "none", width: 32, height: 32, margin: "-6px -6px 0 0", border: 0, borderRadius: 8, background: "none", color: "var(--ink3)" }}>
                            <I name="more_horiz" size={20} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{amtTxt(it)}</div>
                      <div style={{ fontSize: 12, color: "var(--ink3)" }}>{it.due}</div>
                      <div style={{ fontSize: 12, color: TONE[n.tone].fg, fontWeight: 700, lineHeight: 1.35 }}>{n.text}</div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 6 }}>
            <I name="drag_pan" size={18} />
            Arraste os cartões entre as colunas ou use o menu de cada item.
          </div>
        </>
      )}

      <Sheet open={!!mvIt} onClose={() => setMoveId(null)} label="Mover item">
        {mvIt && <MoveSheet it={mvIt} onMove={(to) => move(mvIt.id, to)} onClose={() => setMoveId(null)} />}
      </Sheet>
    </>
  );
}

const amtTxt = (it: PriorityItem) => (it.section === "parcelar" && it.parcel ? `${brl(it.parcel.monthly)}/mês` : brl(it.amount));

function SectionBadge({ id }: { id: Section }) {
  const s = SECTIONS.find((x) => x.id === id)!;
  const t = TONE[s.tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: s.tone === "muted" ? "var(--surface2)" : t.bg, color: s.tone === "muted" ? "var(--ink2)" : t.fg, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
      <I name={s.icon} size={16} />
      {s.label}
    </span>
  );
}

function MoveSheet({ it, onMove, onClose }: { it: PriorityItem; onMove: (s: Section) => void; onClose: () => void }) {
  const opts = moveOptions(it);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 700 }}>Mover para</div>
          <div style={nunito(22)}>{it.name}</div>
          <div style={{ color: "var(--ink2)", fontSize: 14 }}>
            {brl(it.amount)} · {it.due}
          </div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {opts.map((o) => {
          const s = SECTIONS.find((x) => x.id === o.section)!;
          const sel = it.section === o.section;
          const t = TONE[s.tone];
          return (
            <button key={o.section} onClick={() => onMove(o.section)} disabled={!o.allowed} aria-pressed={sel} style={{ textAlign: "left", minHeight: 64, padding: "12px 14px", borderRadius: 16, border: `2px solid ${sel ? "var(--brand-t)" : "var(--line)"}`, background: "var(--surface)", opacity: o.allowed || sel ? 1 : 0.5, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: s.tone === "muted" ? "var(--surface2)" : t.bg, color: s.tone === "muted" ? "var(--ink2)" : t.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <I name={s.icon} />
              </span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 800 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "var(--ink2)" }}>{o.impact}</span>
                {o.cost && <span style={{ fontSize: 13, color: o.tone === "muted" ? "var(--ink3)" : TONE[o.tone].fg, fontWeight: 700 }}>{o.cost}</span>}
              </span>
              {sel && <I name="check_circle" style={{ color: "var(--brand-t)" }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------------- Mapa de crédito ----------------
const RATE_LEVEL = (r: number) => (r <= 0 ? 0 : r < 5 ? 1 : r < 14 ? 2 : 3);
const RB = [
  ["var(--good-soft)", "var(--good-t)"],
  ["var(--surface2)", "var(--ink2)"],
  ["var(--warn-soft)", "var(--warn-t)"],
  ["var(--risk-soft)", "var(--risk-t)"],
];

export function creditInfo(a: Account, ctx: Context) {
  const manual = a.kind === "cartao_manual" && a.closingDay && a.dueDay ? manualStatement(a.closingDay, a.dueDay, a.id, ctx.data.transactions, ctx.today) : null;
  const used = manual ? manual.used : a.used ?? 0;
  const limit = a.creditLimit ?? 0;
  const kind = a.kind === "cartao" ? ((a.debtBalance ?? 0) > 0 ? "Cartão · com rotativo" : "Cartão de crédito") : a.kind === "cheque_especial" ? "Conta corrente" : a.kind === "emprestimo" ? `Pessoal · ${a.installmentsLeft ?? "?"} parcelas restantes` : "Conta manual · sem juros";
  const dates = a.closingDay ? `Fecha dia ${a.closingDay} · vence dia ${a.dueDay}` : a.dueDay ? `Parcela vence dia ${a.dueDay}` : "Juros cobrados por dia de uso";
  return { used, limit, kind, dates, rate: a.monthlyRate ?? 0 };
}

function Credito({ ctx }: { ctx: Context }) {
  const accs = ctx.data.accounts.filter((a) => a.kind !== "conta");
  const day = ctx.today.getDate();
  const tl = accs.filter((a) => a.closingDay && a.dueDay);
  return (
    <>
      <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <h2 style={h2}>Datas de fechamento e vencimento</h2>
          <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap" }}>
            {monthLong(ctx.today.getMonth()).replace(/^./, (c) => c.toUpperCase())} · hoje é dia {day}
          </span>
        </div>
        <div role="img" aria-label="Linha do tempo das datas de fechamento e vencimento de cada cartão no mês" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tl.map((a) => {
            const f = a.closingDay!,
              v = a.dueDay!;
            const fl = ((f - 1) / 30) * 100;
            const vl = ((v - 1) / 30) * 100;
            const span = v < f ? 100 - fl : vl - fl;
            const short = a.kind === "cartao_manual" ? (a.ownerName || a.name).split(" ")[0] : a.institution.split(" ")[0];
            return (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{short}</span>
                <div style={{ position: "relative", height: 24, borderRadius: 12, background: "var(--surface2)" }}>
                  <div style={{ position: "absolute", left: `${fl}%`, width: `${span}%`, top: 10, height: 4, background: "var(--line)" }} />
                  <span title="Fechamento" style={{ position: "absolute", left: `${fl}%`, top: 5, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: "var(--ink2)" }} />
                  <span title="Vencimento" style={{ position: "absolute", left: `${vl}%`, top: 4, width: 16, height: 16, marginLeft: -8, borderRadius: "50%", border: "3px solid var(--accent)", background: "var(--surface)" }} />
                  <span style={{ position: "absolute", left: `${((day - 1) / 30) * 100}%`, top: -3, bottom: -3, width: 2, background: "var(--brand)" }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr)", gap: 10 }}>
            <span />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink3)", fontWeight: 700 }}>
              {["1", "8", "15", "22", "31"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--ink2)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--ink2)" }} />
            Fechamento
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", border: "3px solid var(--accent)" }} />
            Vencimento
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 2, height: 12, background: "var(--brand)" }} />
            Hoje
          </span>
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {accs.map((a) => {
          const info = creditInfo(a, ctx);
          const b = bankOf(a.institution);
          const lv = RATE_LEVEL(info.rate);
          return (
            <article key={a.id} style={{ ...card(20, 16), display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: a.kind === "cartao_manual" ? "var(--accent)" : b.c, color: b.tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flex: "none" }}>
                  {a.kind === "cartao_manual" ? (a.ownerName || "M")[0] : b.m}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{a.name}</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)" }}>{info.kind}</div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: RB[lv][0], color: RB[lv][1], fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{rateLabel(info.rate)}</span>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--ink3)" }}>Usado {brl(info.used)}</span>
                  <span style={{ fontWeight: 800 }}>{brl(Math.max(0, info.limit - info.used))} livre</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Bar pct={info.limit ? info.used / info.limit : 0} h={10} color="var(--ink2)" aria={`${a.name}: ${brl(info.used)} usados de ${brl(info.limit)}`} />
                </div>
                <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>Limite {brl(info.limit)}</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink2)", display: "flex", gap: 6, alignItems: "center" }}>
                <I name="event" size={18} />
                {info.dates}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ---------------- Otimizador de rolagem ----------------
function Rolagem({ ctx }: { ctx: Context }) {
  const { bp, go, toast } = useApp();
  const qc = useQueryClient();
  const faturas = ctx.items.filter((i) => i.commitment.kind === "fatura" && !i.paid);
  const [need, setNeed] = useState<string>(faturas[0]?.id || "");
  useEffect(() => {
    if (!faturas.some((f) => f.id === need) && faturas[0]) setNeed(faturas[0].id);
  }, [faturas, need]);
  const fat = faturas.find((f) => f.id === need);
  const rts = useMemo(() => (fat ? buildRoutes(fat.commitment, ctx.data.accounts, ctx.data.incomes, ctx.today) : []), [fat, ctx]);
  const chosen = ctx.data.rolloverChoices.find((r) => r.commitmentId === need)?.route;
  const [picked, setPicked] = useState<string | null>(null);
  const pick = picked ?? chosen ?? null;
  const hist = rolloverHistory(ctx.data.transactions, ctx.today);
  const trend = rolloverTrend(hist);
  const maxH = Math.max(1, ...hist.map((h) => h.cost));
  const pickedR = rts.find((r) => r.kind === pick);
  const free = ctx.payoff.debtFree;
  const choose = (kind: string) => {
    setPicked(kind);
    void api("PUT", "/api/rollover/choice", { commitmentId: need, route: kind }).then(() => qc.invalidateQueries({ queryKey: ["snapshot"] }));
    if (kind === "parcelar") toast(`${fat!.name} → Parcelar nas prioridades do mês`);
  };
  if (!faturas.length) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Nenhuma fatura em aberto neste mês. Quando houver, comparamos as saídas aqui.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: bp === "desktop" ? "minmax(0,1fr) 280px" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 12 }}>
          <label htmlFor="rol-need" style={{ fontWeight: 800 }}>
            O que você precisa pagar?
          </label>
          <select
            id="rol-need"
            value={need}
            onChange={(e) => {
              setNeed(e.target.value);
              setPicked(null);
            }}
            style={{ minHeight: 48, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface2)", padding: "0 14px", fontWeight: 700 }}
          >
            {faturas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {brl(f.amount)} · {f.due.toLowerCase()}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.45 }}>Comparamos as saídas possíveis com o seu crédito atual. Os números saem do motor financeiro, não de estimativas da IA.</div>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          {rts.map((r) => {
            const sel = pick === r.kind;
            return (
              <article key={r.kind} style={{ background: "var(--surface)", border: `2px solid ${r.best ? "var(--good)" : "var(--line)"}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>Rota {r.letter}</span>
                  {r.best && <span style={{ padding: "3px 8px", borderRadius: 999, background: "var(--good-soft)", color: "var(--good-t)", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>Mais barata com saída</span>}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>{r.name}</div>
                <dl style={{ margin: 0, display: "grid", gap: 8 }}>
                  {[
                    ["Custo total", routeCostLabel(r), 900],
                    ["Fôlego ganho", r.daysLabel, 800],
                    [monthLong(ctx.today.getMonth() + 1).replace(/^./, (c) => c.toUpperCase()), `+${brl(r.nextMonth)}`, 800],
                  ].map(([k, v, w]) => (
                    <div key={k as string} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14 }}>
                      <dt style={{ color: "var(--ink3)", whiteSpace: "nowrap" }}>{k}</dt>
                      <dd style={{ margin: 0, fontWeight: w as number, textAlign: "right" }}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: r.good ? "var(--good-t)" : "var(--warn-t)", fontWeight: 700, display: "flex", gap: 6 }}>
                  <I name={r.good ? "check" : "warning"} size={18} />
                  <span>{r.warn}</span>
                </div>
                <button onClick={() => choose(r.kind)} aria-pressed={sel} style={{ marginTop: "auto", minHeight: 46, borderRadius: 12, border: sel ? 0 : "1px solid var(--line)", background: sel ? "var(--brand)" : "var(--surface)", color: sel ? "var(--brand-on)" : "var(--ink)", fontWeight: 800 }}>
                  {sel ? "Rota escolhida" : "Escolher esta rota"}
                </button>
              </article>
            );
          })}
        </div>
        {pickedR && (
          <div role="status" style={{ padding: "14px 16px", borderRadius: 16, background: "var(--brand-soft)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <I name="check_circle" style={{ color: "var(--brand-t)" }} />
            <div style={{ fontSize: 14, lineHeight: 1.45 }}>
              <b>
                Rota {pickedR.letter}: {pickedR.name}
              </b>{" "}
              entrou no plano de {monthLong(ctx.today.getMonth())}. A saída continua a mesma: o plano de quitação reduz a rolagem a zero{free ? ` até ${monthYear(free)}` : ""}.
            </div>
          </div>
        )}
      </div>
      <aside aria-label="Custo da rolagem" style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 700 }}>Custo da rolagem em {monthLong(ctx.today.getMonth())}</div>
        <div style={{ ...nunito(36), lineHeight: 1 }}>{brl(trend.current)}</div>
        {trend.previous > 0 && (
          <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: trend.delta <= 0 ? "var(--good-soft)" : "var(--warn-soft)", color: trend.delta <= 0 ? "var(--good-t)" : "var(--warn-t)", fontWeight: 800, fontSize: 13 }}>
            <I name={trend.delta <= 0 ? "south" : "north"} size={18} />
            {trend.delta <= 0 ? "Encolheu" : "Cresceu"} {brl(Math.abs(trend.delta))} ({trend.delta <= 0 ? "−" : "+"}
            {Math.abs(Math.round(trend.pct))}%) vs {monthLong(ctx.today.getMonth() - 1)}
          </div>
        )}
        <div role="img" aria-label={`Custo da rolagem de ${brl(hist[0].cost)} em ${monthLong(ctx.today.getMonth() - 5)} para ${brl(trend.current)} em ${monthLong(ctx.today.getMonth())}`} style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 8, alignItems: "end", height: 120 }}>
          {hist.map((h, k) => (
            <div key={h.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", maxWidth: 28, height: `${(h.cost / maxH) * 100}%`, minHeight: h.cost ? 4 : 0, borderRadius: "6px 6px 2px 2px", background: k === 5 ? "var(--good)" : "var(--line)" }} />
              <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 700 }}>{h.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderRadius: 14, background: "var(--surface2)", fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Rolar dívida compra tempo, mas custa. Use só para atravessar o mês enquanto o plano diminui o buraco.</div>
        <button onClick={() => go("plano", "quitacao")} style={btnPrimary(46, { borderRadius: 12 })}>
          Ver a saída: plano de quitação
          <I name="arrow_forward" size={18} />
        </button>
      </aside>
    </div>
  );
}

// ---------------- Plano de quitação ----------------
function Quitacao({ ctx }: { ctx: Context }) {
  const p = ctx.payoff;
  if (!p.debts.length) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Você não tem dívidas com juros registradas. Se tiver dívida com alguém, cadastre em Contas › Dívidas pessoais.</div>;
  const total = Math.max(1, ...p.debts.map((d) => d.payoffIndex + 1));
  const start = new Date(ctx.today.getFullYear(), ctx.today.getMonth(), 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const d = new Date(start.getFullYear(), start.getMonth() + Math.round((total - 1) * f), 1);
    return `${monthShort(d.getMonth())} ${String(d.getFullYear()).slice(2)}`;
  });
  const color = (r: number) => (r >= 10 ? "var(--risk)" : r >= 5 ? "var(--warn)" : r > 0 ? "var(--accent)" : "var(--brand)");
  return (
    <>
      <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 16 }}>
        <ol aria-label={`Jornada em 4 fases, fase atual: ${ctx.phases[ctx.phase - 1].label}`} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
          {ctx.phases.map((f) => (
            <li key={f.n} style={{ padding: 12, borderRadius: 16, background: f.current ? "var(--brand-soft)" : "var(--surface)", border: `2px solid ${f.current ? "var(--brand-t)" : "var(--line)"}`, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: f.current ? "var(--brand-t)" : "var(--ink3)" }}>
                Fase {f.n}
                {f.current ? " · agora" : ""}
              </span>
              <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>{f.label}</span>
              <span style={{ fontSize: 12, color: "var(--ink3)" }}>{f.when}</span>
            </li>
          ))}
        </ol>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {[
            ["Dívida total", brl(p.totalDebt), "var(--ink)"],
            ["Juros até quitar", brl(p.totalInterest), "var(--ink)"],
            ["Livre das dívidas", p.debtFree ? monthYear(p.debtFree) : "—", "var(--good-t)"],
            ["vs pagar só o mínimo", p.savingsVsMin > 0 ? `−${brl(p.savingsVsMin)}` : brl(0), "var(--ink)"],
          ].map(([k, v, c]) => (
            <div key={k}>
              <div style={{ fontSize: 13, color: "var(--ink3)" }}>{k}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink2)" }}>Com {brl(p.budget)} por mês para dívidas. Ajuste em Perfil e configurações.</div>
      </section>
      <section aria-labelledby="h-quit" style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="h-quit" style={h2}>
          Da mais cara para a mais barata
        </h2>
        {p.debts.map((d, i) => (
          <div key={d.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>{i + 1}</span>
              <span style={{ fontWeight: 800, flex: 1, minWidth: 140 }}>{d.name}</span>
              <span style={{ fontSize: 13, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "var(--surface2)", whiteSpace: "nowrap" }}>{rateLabel(d.rate)}</span>
              <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(d.balance)}</span>
            </div>
            <div role="img" aria-label={`${d.name}, ${rateLabel(d.rate)}, quitada em ${monthYear(d.payoffDate)}`} style={{ position: "relative", height: 16, borderRadius: 8, background: "var(--surface2)" }}>
              <div style={{ width: `${((d.payoffIndex + 1) / total) * 100}%`, height: "100%", borderRadius: 8, background: color(d.rate) }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13, color: "var(--ink2)" }}>
              <span style={{ whiteSpace: "nowrap" }}>
                Quitada em <b style={{ color: "var(--ink)" }}>{monthYear(d.payoffDate)}</b>
              </span>
              <span style={{ whiteSpace: "nowrap" }}>
                Juros pagos até lá: <b style={{ color: "var(--ink)" }}>{brl(d.interest)}</b>
              </span>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink3)", fontWeight: 700 }}>
          {ticks.map((t, k) => (
            <span key={k}>{t}</span>
          ))}
        </div>
      </section>
    </>
  );
}

// ---------------- Renegociação ----------------
function Renegociacao({ ctx }: { ctx: Context }) {
  const debts = ctx.debts.filter((d) => d.kind !== "pessoal");
  const [id, setId] = useState(debts[0]?.id || "");
  const [n, setN] = useState(12);
  const [copied, setCopied] = useState(false);
  const d = debts.find((x) => x.id === id) || debts[0];
  if (!d) return <div style={{ ...card(22, 18), color: "var(--ink2)" }}>Nenhuma dívida com banco para renegociar.</div>;
  const acc = ctx.data.accounts.find((a) => a.id === d.accountId);
  const r = renegotiate(d, n, acc?.installmentsLeft)!;
  return (
    <section style={{ ...card(22, 18), display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontWeight: 800 }}>Escolha uma dívida</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {debts.map((x) => {
          const sel = x.id === d.id;
          return (
            <button
              key={x.id}
              onClick={() => {
                setId(x.id);
                setCopied(false);
              }}
              aria-pressed={sel}
              style={{ minHeight: 44, padding: "0 14px", borderRadius: 999, border: `1px solid ${sel ? "var(--ink)" : "var(--line)"}`, background: sel ? "var(--ink)" : "var(--surface)", color: sel ? "var(--bg)" : "var(--ink2)", fontWeight: 700, fontSize: 14 }}
            >
              {x.name}
            </button>
          );
        })}
      </div>
      <div style={{ padding: 16, borderRadius: 18, background: "var(--brand-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 13, color: "var(--brand-t)", fontWeight: 800 }}>Faixa sugerida para proposta à vista</div>
        <div style={nunito(30)}>
          {brl(r.range[0])} a {brl(r.range[1])}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink2)" }}>Saldo atual {brl(d.balance)} · desconto comum em acordos desse tipo</div>
      </div>
      <div>
        <label htmlFor="ren-n" style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, gap: 8, whiteSpace: "nowrap" }}>
          <span>Ou parcelar em</span>
          <span>{n} meses</span>
        </label>
        <input id="ren-n" type="range" min={6} max={36} step={1} value={n} onChange={(e) => setN(+e.target.value)} style={{ width: "100%", height: 44 }} />
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>Taxa de referência {pct(r.refRate)} ao mês</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Antes</div>
          <KV k="Parcela" v={r.before.installment} />
          <KV k="Prazo" v={r.before.term} />
          <KV k="Total" v={r.before.total} />
        </div>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--good-soft)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--good-t)", textTransform: "uppercase", letterSpacing: ".05em" }}>Depois</div>
          <KV k="Parcela" v={brl(r.newInstallment)} w={900} />
          <KV k="Prazo" v={`${n} meses`} />
          <KV k="Total" v={brl(r.newTotal)} />
        </div>
      </div>
      <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Como pedir</div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink2)", lineHeight: 1.5 }}>{r.script}</p>
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(r.script).catch(() => {});
            setCopied(true);
          }}
          style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}
        >
          <I name="content_copy" size={18} />
          {copied ? "Copiado" : "Copiar mensagem"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.45 }}>O PayPilot não indica bancos nem vende crédito. Leve esta proposta à instituição onde está a dívida.</div>
    </section>
  );
}

function KV({ k, v, w = 800 }: { k: string; v: string; w?: number }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink3)" }}>{k}</div>
      <div style={{ fontWeight: w } as CSSProperties}>{v}</div>
    </div>
  );
}
