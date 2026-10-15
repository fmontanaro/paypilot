// Gastos (Gastos.dc.html): por categoria, transações (+ detalhe), tetos, caçador de vazamentos e check-in.
import { useMemo, useRef, useState, type CSSProperties } from "react";
import type { Leak, Transaction } from "@shared/schema";
import { CATEGORIES, catColor, catSoft, category, PICKABLE } from "@shared/categories";
import { byDay, cancelSteps, categoryRows, donutSegments, leakTotals, rulePattern, subscriptionsInUse, type Context, type TypeFilter } from "@shared/engine";
import { brl, dayMonth, daysInMonth, fromIso, monthKey, parseMoney, weekday } from "@shared/format";
import { hasFeature } from "@shared/plans";
import { api, useAction, useCtx } from "@/lib/api";
import { useApp } from "@/lib/app";
import { Bar, btnLink, btnPrimary, card, check, CloseBtn, Empty, I, input, labelCol, MarkerLegend, nunito, Paywall, PillTabs, SectionHead, Sheet } from "@/ui";

const TABS = [
  { id: "categorias", label: "Por categoria", icon: "donut_large" },
  { id: "transacoes", label: "Transações", icon: "list" },
  { id: "tetos", label: "Tetos", icon: "speed" },
  { id: "vazamentos", label: "Caçador de vazamentos", icon: "water_drop" },
  { id: "checkin", label: "Check-in", icon: "style" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const selectPill: CSSProperties = { minHeight: 40, borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", padding: "0 12px", fontWeight: 700, fontSize: 13 };

export default function Gastos() {
  const { sub, go } = useApp();
  const tab = (TABS.some((t) => t.id === sub) ? sub : "categorias") as Tab;
  const { ctx } = useCtx();
  if (!ctx) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PillTabs label="Seções de gastos" tabs={TABS as unknown as { id: Tab; label: string; icon: string }[]} value={tab} onChange={(id) => go("gastos", id)} />
      {tab === "categorias" && <Categorias ctx={ctx} />}
      {tab === "transacoes" && <Transacoes ctx={ctx} />}
      {tab === "tetos" && <Tetos ctx={ctx} />}
      {tab === "vazamentos" && <Vazamentos ctx={ctx} />}
      {tab === "checkin" && <Checkin ctx={ctx} />}
    </div>
  );
}

function spendAccounts(ctx: Context) {
  return ctx.data.accounts.filter((a) => ctx.data.transactions.some((t) => t.accountId === a.id && t.kind === "gasto"));
}

// ---------------- Por categoria ----------------
function Categorias({ ctx }: { ctx: Context }) {
  const { bp } = useApp();
  const [type, setType] = useState<TypeFilter>("todos");
  const [acc, setAcc] = useState("todas");
  const [grp, setGrp] = useState("todos");
  const rows = categoryRows(ctx.data.transactions, ctx.today, ctx.income, { type, accountId: acc, groupId: grp });
  const total = rows.reduce((a, r) => a + r.value, 0);
  const segs = donutSegments(rows);
  const donut = total ? `conic-gradient(${segs.map((s) => `${catColor(s.hue)} ${s.from.toFixed(1)}deg ${(s.to - 1.2).toFixed(1)}deg, var(--surface) ${(s.to - 1.2).toFixed(1)}deg ${s.to.toFixed(1)}deg`).join(",")})` : "var(--surface2)";
  const prevMonth = new Date(ctx.today.getFullYear(), ctx.today.getMonth() - 1, 1);
  const prevShort = dayMonth(prevMonth).split(" ")[1];
  const F: [TypeFilter, string][] = [
    ["todos", "Todos"],
    ["fixo", "Fixo"],
    ["variavel", "Variável"],
    ["essencial", "Essencial"],
    ["superfluo", "Supérfluo"],
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {F.map(([id, label]) => {
          const sel = type === id;
          return (
            <button key={id} onClick={() => setType(id)} aria-pressed={sel} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: `1px solid ${sel ? "var(--brand-t)" : "var(--line)"}`, background: sel ? "var(--brand-soft)" : "var(--surface)", color: sel ? "var(--brand-t)" : "var(--ink2)", fontWeight: 700, fontSize: 13 }}>
              {label}
            </button>
          );
        })}
        <select aria-label="Conta ou cartão" value={acc} onChange={(e) => setAcc(e.target.value)} style={selectPill}>
          <option value="todas">Todas as contas</option>
          {spendAccounts(ctx).map((a) => (
            <option key={a.id} value={a.id}>
              {ctx.accountLabel(a.id)}
            </option>
          ))}
        </select>
        <select aria-label="Grupo de despesa" value={grp} onChange={(e) => setGrp(e.target.value)} style={selectPill}>
          <option value="todos">Todos os grupos</option>
          <option value="pessoal">Pessoal</option>
          {ctx.data.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: bp === "mobile" ? "minmax(0,1fr)" : "260px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ ...card(22, 20), display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div role="img" aria-label={`Gráfico de rosca: ${brl(total)} gastos até ${dayMonth(ctx.today)}. ${rows.slice(0, 3).map((r) => `${r.name} ${brl(r.value)}`).join(", ")}.`} style={{ position: "relative", width: 200, height: 200, borderRadius: "50%", background: donut }}>
            <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 700 }}>Até {dayMonth(ctx.today)}</span>
              <span style={nunito(26)}>{brl(total)}</span>
              <span style={{ fontSize: 12, color: "var(--ink3)" }}>{ctx.income ? Math.round((total / ctx.income) * 100) : 0}% da renda</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink2)", textAlign: "center", lineHeight: 1.45 }}>
            Maior categoria: <b>{rows[0]?.name || "—"}</b>
          </div>
        </section>
        <section aria-label="Categorias" style={{ ...card(22, "8px 16px") }}>
          {rows.map((r) => {
            const up = r.variation > 0.005,
              down = r.variation < -0.005;
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr) auto", gap: 12, alignItems: "center", minHeight: 64, borderBottom: "1px solid var(--line)" }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: catSoft(r.hue), color: catColor(r.hue), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I name={r.icon} size={20} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)" }}>
                    {r.incomePct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da renda · {r.fixed ? "Fixo" : "Variável"} · {r.essential ? "Essencial" : "Supérfluo"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800 }}>{brl(r.value)}</div>
                  {r.previous > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 800, color: down ? "var(--good-t)" : "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                      <I name={up ? "north_east" : down ? "south_east" : "east"} size={14} />
                      {up ? "+" : ""}
                      {Math.round(r.variation * 100)}% vs {prevShort}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!rows.length && <div style={{ padding: "32px 8px", textAlign: "center", color: "var(--ink3)" }}>Nenhuma categoria com esses filtros.</div>}
        </section>
      </div>
    </>
  );
}

// ---------------- Transações ----------------
const FLAG: Record<string, [string, string]> = { dup: ["Possível cobrança duplicada", "content_copy"], music: ["2º serviço de música", "library_music"], fee: ["Tarifa evitável", "water_drop"] };

function dayLabel(iso: string, today: Date) {
  const d = fromIso(iso);
  const diff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - d.getTime()) / 86_400_000);
  return diff === 0 ? `Hoje, ${dayMonth(d)}` : diff === 1 ? `Ontem, ${dayMonth(d)}` : `${weekday(d)}, ${dayMonth(d)}`;
}

function Transacoes({ ctx }: { ctx: Context }) {
  const { bp, go, toast } = useApp();
  const isM = bp === "mobile";
  const [q, setQ] = useState("");
  const [acc, setAcc] = useState("todas");
  const [open, setOpen] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number } | null>(null);
  const x0 = useRef<number | null>(null);
  const [detId, setDetId] = useState<string | null>(null);
  const patch = useAction((v: { id: string; body: Record<string, unknown> }) => api("PATCH", `/api/transactions/${v.id}`, v.body));
  const month = monthKey(ctx.today);
  const qn = q.trim().toLowerCase();
  const txs = ctx.data.transactions.filter((t) => (qn ? t.description.toLowerCase().includes(qn) : t.date.startsWith(month)) && (acc === "todas" || t.accountId === acc));
  const days = byDay(txs);
  const det = ctx.data.transactions.find((t) => t.id === detId) || null;

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 240px", display: "flex", alignItems: "center", gap: 8, minHeight: 48, padding: "0 14px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" }}>
          <I name="search" style={{ color: "var(--ink3)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estabelecimento" aria-label="Buscar transações" style={{ flex: 1, minWidth: 0, border: 0, background: "none", outline: "none", fontSize: 15 }} />
        </label>
        <select aria-label="Filtrar por conta" value={acc} onChange={(e) => setAcc(e.target.value)} style={{ minHeight: 48, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", padding: "0 12px", fontWeight: 700 }}>
          <option value="todas">Todas as contas</option>
          {ctx.data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {ctx.accountLabel(a.id)}
            </option>
          ))}
        </select>
      </div>
      {isM && (
        <div style={{ fontSize: 13, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 6 }}>
          <I name="swipe_left" size={18} />
          Deslize um item para recategorizar ou marcar para cancelar.
        </div>
      )}
      {days.map((d) => (
        <section key={d.key} aria-label={dayLabel(d.date, ctx.today)} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>
            <span>{dayLabel(d.date, ctx.today)}</span>
            <span>{brl(d.total, true)}</span>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden" }}>
            {d.items.map((t) => {
              const c = category(t.categoryId);
              const isOpen = open === t.id;
              const dr = drag && drag.id === t.id ? drag.dx : null;
              const x = dr != null ? Math.max(-168, Math.min(0, (isOpen ? -168 : 0) + dr)) : isOpen ? -168 : 0;
              const fl = t.flag ? FLAG[t.flag] : null;
              const openDet = () => {
                setOpen(null);
                setDetId(t.id);
              };
              return (
                <div key={t.id} style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid var(--line)" }}>
                  {isM && (
                    <div aria-hidden={!isOpen} style={{ position: "absolute", top: 0, right: 0, bottom: 0, display: "flex" }}>
                      <button onClick={openDet} tabIndex={isOpen ? 0 : -1} style={{ width: 84, border: 0, background: "var(--brand)", color: "var(--brand-on)", fontWeight: 800, fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        <I name="sell" />
                        Categoria
                      </button>
                      <button
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => {
                          setOpen(null);
                          if (t.categoryId === "assinaturas") go("gastos", "vazamentos");
                          else toast(`${t.description} marcado para cancelar`);
                        }}
                        style={{ width: 84, border: 0, background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                      >
                        <I name="block" />
                        Cancelar
                      </button>
                    </div>
                  )}
                  <div
                    onTouchStart={(e) => {
                      if (!isM) return;
                      x0.current = e.touches[0].clientX;
                      setDrag({ id: t.id, dx: 0 });
                    }}
                    onTouchMove={(e) => {
                      if (x0.current == null) return;
                      setDrag({ id: t.id, dx: e.touches[0].clientX - x0.current });
                    }}
                    onTouchEnd={() => {
                      const dx = drag?.dx ?? 0;
                      x0.current = null;
                      setDrag(null);
                      setOpen(dx < -50 || (isOpen && dx < 40) ? t.id : null);
                    }}
                    style={{ position: "relative", background: "var(--surface)", transform: `translateX(${x}px)`, transition: dr != null ? "none" : "transform .2s ease", display: "grid", gridTemplateColumns: "40px minmax(0,1fr) auto", gap: 12, alignItems: "center", minHeight: 68, padding: "8px 14px" }}
                  >
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: catSoft(c.hue), color: catColor(c.hue), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <I name={c.icon} size={20} />
                    </span>
                    <button onClick={openDet} style={{ minWidth: 0, border: 0, background: "none", textAlign: "left", padding: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</div>
                      <div style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.kind === "entrada" ? "Entrada" : t.kind === "pagamento_fatura" ? "Pagamento de fatura" : c.name} · {ctx.accountLabel(t.accountId)}
                      </div>
                      {fl && (
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--warn-t)", display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                          <I name={fl[1]} size={14} />
                          {fl[0]}
                        </div>
                      )}
                    </button>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontWeight: 800, color: t.amount < 0 ? "var(--good-t)" : undefined }}>{t.amount < 0 ? "+" + brl(-t.amount, true) : brl(t.amount, true)}</span>
                      {!isM && t.kind === "gasto" && (
                        <select aria-label={`Mudar categoria de ${t.description}`} value={t.categoryId} onChange={(e) => patch.mutate({ id: t.id, body: { categoryId: e.target.value } }, { onSuccess: () => toast("Categoria atualizada") })} style={{ maxWidth: 150, minHeight: 32, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface2)", fontSize: 12, fontWeight: 700, padding: "0 6px" }}>
                          {CATEGORIES.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {!days.length && <Empty icon="search_off" title="Nada encontrado" text="Tente outro nome ou limpe os filtros." />}
      <Sheet open={!!det} onClose={() => setDetId(null)} label="Detalhe da transação" width={460}>
        {det && <Detalhe t={det} ctx={ctx} onClose={() => setDetId(null)} />}
      </Sheet>
    </>
  );
}

function Detalhe({ t, ctx, onClose }: { t: Transaction; ctx: Context; onClose: () => void }) {
  const { toast } = useApp();
  const splitsNow = ctx.data.splits.filter((s) => s.transactionId === t.id);
  const manual = ctx.data.accounts.find((a) => a.kind === "cartao_manual");
  const pdebt = ctx.data.personalDebts[0];
  const [cat, setCat] = useState(t.categoryId);
  const [grp, setGrp] = useState(t.groupId || "");
  const [note, setNote] = useState(t.notes || "");
  const [split, setSplit] = useState(splitsNow.length > 0);
  const [s1, setS1] = useState(String(splitsNow.find((s) => s.target === "fatura")?.amount ?? Math.round(Math.abs(t.amount) * 0.8)));
  const [rule, setRule] = useState(false);
  const save = useAction((body: Record<string, unknown>) => api("PATCH", `/api/transactions/${t.id}`, body), {
    onDone: () => {
      toast(rule ? "Salvo. Regra criada para casos parecidos" : "Transação atualizada");
      onClose();
    },
  });
  const v1 = parseMoney(s1);
  const v2 = Math.max(0, Math.abs(t.amount) - v1);
  const canSplit = !!manual && !!pdebt;
  const c = category(cat);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 700 }}>
            {dayLabel(t.date, ctx.today)} · {ctx.accountLabel(t.accountId)}
          </div>
          <div style={nunito(22)}>{t.description}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{brl(Math.abs(t.amount), true)}</div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Categoria</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PICKABLE.map((id) => {
              const k = category(id);
              const sel = cat === id;
              return (
                <button key={id} onClick={() => setCat(id)} aria-pressed={sel} style={{ minHeight: 40, padding: "0 12px", borderRadius: 999, border: `2px solid ${sel ? catColor(k.hue) : "var(--line)"}`, background: sel ? catSoft(k.hue) : "var(--surface)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <I name={k.icon} size={16} style={{ color: catColor(k.hue) }} />
                  {k.name}
                </button>
              );
            })}
          </div>
        </div>
        <label style={labelCol}>
          Grupo de despesa
          <select value={grp} onChange={(e) => setGrp(e.target.value)} style={input(48)}>
            <option value="">Pessoal</option>
            {ctx.data.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label style={labelCol}>
          Notas
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: jantar de aniversário" style={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", padding: "10px 12px", fontWeight: 500, resize: "vertical" }} />
        </label>
        {canSplit && (
          <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontWeight: 800, minHeight: 44 }}>
              Dividir esta transação
              <input type="checkbox" checked={split} onChange={() => setSplit(!split)} style={check} />
            </label>
            {split && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px", gap: 8, alignItems: "center", fontSize: 14 }}>
                  <span>Pagamento da fatura · {manual!.name.replace(/ \(.*\)$/, "")}</span>
                  <input aria-label="Valor para fatura" inputMode="decimal" value={s1} onChange={(e) => setS1(e.target.value)} style={{ ...input(44, { fontWeight: 700, textAlign: "right", borderRadius: 10, padding: "0 10px" }) }} />
                  <span>Abatimento · Dívida com {pdebt!.creditor}</span>
                  <span style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 10px", fontWeight: 800 }}>{brl(v2, true)}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>Cada parte abate o lugar certo e o gasto não conta duas vezes.</div>
              </>
            )}
          </div>
        )}
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, border: "1px solid var(--line)", minHeight: 44 }}>
          <span>
            <span style={{ display: "block", fontWeight: 800 }}>Criar regra para casos parecidos</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--ink2)", marginTop: 2 }}>
              Sempre classificar “{rulePattern(t.description)}” como {c.name}
            </span>
          </span>
          <input type="checkbox" checked={rule} onChange={() => setRule(!rule)} style={check} />
        </label>
        <button
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              categoryId: cat,
              groupId: grp || null,
              notes: note || null,
              createRule: rule,
              splits: canSplit ? (split ? [{ target: "fatura", targetId: manual!.id, amount: v1 }, ...(v2 > 0 ? [{ target: "divida_pessoal", targetId: pdebt!.id, amount: v2 }] : [])] : []) : undefined,
            })
          }
          style={btnPrimary(52, { fontSize: 16 })}
        >
          Salvar
        </button>
        {save.error && <div style={{ color: "var(--risk-t)", fontSize: 14, fontWeight: 700 }}>{(save.error as Error).message}</div>}
      </div>
    </>
  );
}

// ---------------- Tetos ----------------
function Tetos({ ctx }: { ctx: Context }) {
  const { plan, toast } = useApp();
  const [newCat, setNewCat] = useState("");
  const [newVal, setNewVal] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const [edVal, setEdVal] = useState("");
  const create = useAction((v: { categoryId: string; monthlyLimit: number }) => api("POST", "/api/budgets", v));
  const update = useAction((v: { id: string; monthlyLimit: number }) => api("PATCH", `/api/budgets/${v.id}`, { monthlyLimit: v.monthlyLimit }));
  const list = ctx.ceilings;
  const dim = daysInMonth(ctx.today);
  if (!hasFeature(plan, "tetos")) {
    const worst = [...list].sort((a, b) => b.projection - b.limit - (a.projection - a.limit))[0];
    return <Paywall need="plus" headline={worst ? `Seu gasto com ${worst.label} vai fechar o mês em ${brl(worst.projection)}` : "Saiba no dia 15 como o mês vai fechar"} detail={`Com tetos e alertas, você sabe no dia ${ctx.today.getDate()} o que vai acontecer no dia ${dim}.`} teaser={list.slice(0, 3).map((c) => ({ a: c.label, b: brl(c.spent) }))} />;
  }
  const free = CATEGORIES.filter((c) => c.id !== "transferencia" && !ctx.data.budgets.some((b) => b.categoryId === c.id));
  const nc = newCat || free[0]?.id || "";
  return (
    <>
      {free.length > 0 && (
        <section style={{ ...card(22, 16), display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <label style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>
            Categoria
            <select value={nc} onChange={(e) => setNewCat(e.target.value)} style={input(48)}>
              {free.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>
            Limite por mês
            <input inputMode="numeric" value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="R$ 1.500" style={input(48)} />
          </label>
          <button
            onClick={() => {
              const v = parseMoney(newVal);
              if (!v || !nc) return;
              create.mutate({ categoryId: nc, monthlyLimit: v }, { onSuccess: () => (toast(`Teto de ${category(nc).name} criado`), setNewVal(""), setNewCat("")) });
            }}
            style={btnPrimary(48, { flex: "none", borderRadius: 12 })}
          >
            Criar teto
          </button>
        </section>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {list.map((t) => {
          const c = category(t.categoryId);
          const warn = t.status !== "ritmo";
          return (
            <article key={t.id} style={{ ...card(20, 16), display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: catSoft(c.hue), color: catColor(c.hue), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <I name={c.icon} size={20} />
                  </span>
                  {t.label}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, background: warn ? "var(--warn-soft)" : "var(--good-soft)", color: warn ? "var(--warn-t)" : "var(--good-t)", fontSize: 12, fontWeight: 800 }}>
                  <I name={warn ? "warning" : "check"} size={14} />
                  {t.status === "limite" ? "No limite" : t.status === "acima" ? "Acima do ritmo" : "No ritmo"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 22, fontWeight: 900 }}>{brl(t.spent)}</span>
                {edit === t.id ? (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input aria-label="Novo limite" inputMode="numeric" value={edVal} onChange={(e) => setEdVal(e.target.value)} style={input(40, { width: 90, borderRadius: 10, padding: "0 8px" })} />
                    <button
                      onClick={() => {
                        const v = parseMoney(edVal);
                        if (!v) return;
                        update.mutate({ id: t.id, monthlyLimit: v }, { onSuccess: () => (toast(`Teto de ${t.label} agora é ${brl(v)}`), setEdit(null)) });
                      }}
                      style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: 0, background: "var(--brand)", color: "var(--brand-on)", fontWeight: 800 }}
                    >
                      Salvar
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setEdit(t.id);
                      setEdVal(String(t.limit));
                    }}
                    style={{ minHeight: 44, border: 0, background: "none", color: "var(--ink2)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    de {brl(t.limit)}
                    <I name="edit" size={16} />
                  </button>
                )}
              </div>
              <Bar pct={t.pct} color={t.over ? "var(--warn)" : "var(--good)"} marker={t.expectedPace} aria={`${t.label}: ${brl(t.spent)} de ${brl(t.limit)}. Projeção ${brl(t.projection)}.`} />
              <div style={{ fontSize: 13, color: "var(--ink2)" }}>{t.over ? `No ritmo atual, ${brl(t.projection)} até o dia ${dim} (${brl(t.projection - t.limit)} acima)` : `No ritmo atual, ${brl(t.projection)} até o dia ${dim}. Dentro do teto.`}</div>
            </article>
          );
        })}
      </div>
      {list.length > 0 && <MarkerLegend text={`Marcador = ritmo esperado para o dia ${ctx.today.getDate()} de ${dim}`} />}
      {!list.length && <Empty icon="speed" title="Nenhum teto ainda" text="Escolha uma categoria e um limite por mês." />}
    </>
  );
}

// ---------------- Caçador de vazamentos ----------------
const LEAK_SECS: [Leak["kind"], string, string][] = [
  ["sub", "Assinaturas", "subscriptions"],
  ["tar", "Tarifas e anuidades", "account_balance"],
  ["seg", "Seguros embutidos", "shield"],
  ["dup", "Cobranças duplicadas", "content_copy"],
];

function Vazamentos({ ctx }: { ctx: Context }) {
  const { plan, go, toast } = useApp();
  const full = hasFeature(plan, "vazamentos_completo");
  const leaks = ctx.data.leaks;
  const tot = leakTotals(leaks);
  const [cxId, setCxId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [steps, setSteps] = useState<Record<number, boolean>>({});
  const [proto, setProto] = useState("");
  const [showUse, setShowUse] = useState(false);
  const set = useAction((v: { id: string; status: string; protocol?: string | null }) => api("PATCH", `/api/leaks/${v.id}`, { status: v.status, protocol: v.protocol }));
  const open = leaks.filter((l) => l.status === "aberto");
  const music = open.find((l) => l.kind === "sub" && /música repetido/.test(l.reason));
  const inUse = subscriptionsInUse(ctx.data.subscriptions, leaks);
  const inUseTotal = inUse.reduce((a, s) => a + s.amount, 0);
  const cx = leaks.find((l) => l.id === cxId) || null;
  return (
    <>
      <section style={{ background: "var(--brand-deep)", color: "#fff", borderRadius: 24, padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FCE7C3" }}>Desperdício encontrado</div>
          <div style={{ ...nunito(44), lineHeight: 1.05 }}>
            {brl(tot.monthly, true)}
            <span style={{ fontSize: 18 }}>/mês</span>
          </div>
          <div style={{ fontSize: 14, color: "#E6F2EA", marginTop: 4 }}>
            ≈ {brl(tot.yearly)} por ano{tot.duplicates > 0 ? ` · mais ${brl(tot.duplicates, true)} cobrados em dobro` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tot.saved > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.12)", fontWeight: 800 }}>
              <I name="savings" style={{ color: "#9BE0B5" }} />
              Você já recuperou {brl(tot.saved, true)}/mês
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
            {[
              [tot.counts.sub, "assinaturas", "assinatura"],
              [tot.counts.tar, "tarifas", "tarifa"],
              [tot.counts.seg, "seguros", "seguro"],
              [tot.counts.dup, "duplicadas", "duplicada"],
            ].map(([n, pl, sg]) => (
              <span key={pl as string} style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)" }}>
                {n} {n === 1 ? sg : pl}
              </span>
            ))}
          </div>
        </div>
      </section>
      {!full ? (
        <Paywall need="plus" headline={`Encontramos ${brl(tot.monthly)} por mês que você pode recuperar`} detail="No plano Grátis você vê o resumo. No Plus, cada item vem com o passo a passo para cancelar." teaser={open.slice(0, 3).map((l) => ({ a: l.name, b: brl(l.amount, true) }))} />
      ) : (
        <>
          {music && (
            <div role="note" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 18, background: "var(--warn-soft)" }}>
              <I name="library_music" style={{ color: "var(--warn-t)" }} />
              <div style={{ fontSize: 14, lineHeight: 1.45 }}>
                <b>Você paga 2 serviços de música</b> em cartões diferentes: {music.reason.split("paga ")[1]?.replace(" no ", " (") + ")"} e {music.name} ({music.sourceLabel}). Ficar com um economiza {brl(music.amount, true)}/mês.
              </div>
            </div>
          )}
          {LEAK_SECS.map(([kind, title, icon]) => {
            const its = open.filter((l) => l.kind === kind);
            const sum = its.reduce((a, l) => a + l.amount, 0);
            return (
              <section key={kind} aria-label={title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionHead icon={icon} title={title} right={kind === "dup" ? `${brl(sum, true)} uma vez` : `${brl(sum, true)}/mês`} />
                {its.map((l) => (
                  <article key={l.id} style={{ ...card(18, 14), display: "flex", flexDirection: "column", gap: 10, animation: "pp-up .2s ease" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, flex: "none" }}>
                        {l.monogram}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontWeight: 800 }}>{l.name}</span>
                          <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                            {brl(l.amount, true)}
                            {kind === "dup" ? "" : "/mês"}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink3)" }}>{l.sourceLabel}</div>
                        <div style={{ fontSize: 13, color: "var(--warn-t)", fontWeight: 700, marginTop: 4 }}>{l.reason}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => set.mutate({ id: l.id, status: "uso" }, { onSuccess: () => toast(`${l.name} marcado como ${kind === "dup" ? "correto" : "em uso"}`) })} style={{ flex: "1 1 90px", minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700, fontSize: 14 }}>
                        {kind === "dup" ? "Foi certo" : "Ainda uso"}
                      </button>
                      <button
                        onClick={() => {
                          setCxId(l.id);
                          setDone(false);
                          setSteps({});
                          setProto("");
                        }}
                        style={{ flex: "1 1 120px", minHeight: 44, borderRadius: 12, border: 0, background: "var(--brand)", color: "var(--brand-on)", fontWeight: 800, fontSize: 14 }}
                      >
                        {kind === "dup" ? "Contestar" : "Quero cancelar"}
                      </button>
                      <button onClick={() => set.mutate({ id: l.id, status: "ignorado" }, { onSuccess: () => toast(`${l.name} ignorado`) })} style={{ flex: "0 1 80px", minHeight: 44, borderRadius: 12, border: 0, background: "none", color: "var(--ink3)", fontWeight: 700, fontSize: 14 }}>
                        Ignorar
                      </button>
                    </div>
                  </article>
                ))}
                {!its.length && (
                  <div style={{ padding: 16, borderRadius: 18, border: "1px dashed var(--line)", textAlign: "center", color: "var(--good-t)", fontWeight: 700, display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                    <I name="task_alt" />
                    Tudo revisado nesta seção
                  </div>
                )}
              </section>
            );
          })}
          {inUse.length > 0 && (
            <button onClick={() => setShowUse(!showUse)} style={{ minHeight: 48, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {showUse ? "Esconder assinaturas em uso" : `${inUse.length} assinaturas em uso · ${brl(inUseTotal)}/mês`}
              <I name={showUse ? "expand_less" : "expand_more"} size={18} />
            </button>
          )}
          {showUse && (
            <div style={{ ...card(18, "4px 14px") }}>
              {inUse.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, minHeight: 48, alignItems: "center", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                  <span>
                    <b>{s.name}</b> <span style={{ color: "var(--ink3)" }}>· {s.accountLabel}</span>
                  </span>
                  <span style={{ fontWeight: 800 }}>{brl(s.amount, true)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <Sheet open={!!cx} onClose={() => setCxId(null)} label="Cancelar assinatura" width={460}>
        {cx && !done && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 700 }}>{cx.kind === "dup" ? "Passo a passo para contestar" : "Passo a passo para cancelar"}</div>
                <div style={nunito(22)}>{cx.name}</div>
                <div style={{ color: "var(--ink2)" }}>
                  {brl(cx.amount, true)}
                  {cx.kind === "dup" ? "" : "/mês"} · {cx.sourceLabel}
                </div>
              </div>
              <CloseBtn onClick={() => setCxId(null)} />
            </div>
            <ol style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {cancelSteps(cx).map((t, k) => {
                const dn = !!steps[k];
                return (
                  <li key={k}>
                    <button onClick={() => setSteps({ ...steps, [k]: !dn })} aria-pressed={dn} style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 16, border: `1px solid ${dn ? "var(--good)" : "var(--line)"}`, background: dn ? "var(--good-soft)" : "var(--surface)", minHeight: 56 }}>
                      <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, background: dn ? "var(--good)" : "var(--surface2)", color: dn ? "#fff" : "var(--ink)" }}>{dn ? "✓" : k + 1}</span>
                      <span style={{ fontSize: 15, lineHeight: 1.45 }}>{t}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <label style={{ ...labelCol, marginTop: 14 }}>
              Número de protocolo (opcional)
              <input value={proto} onChange={(e) => setProto(e.target.value)} placeholder="Ex.: 2026101512345" style={input(48, { fontWeight: 600 })} />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              <button onClick={() => set.mutate({ id: cx.id, status: "cancelado", protocol: proto || null }, { onSuccess: () => setDone(true) })} style={btnPrimary(52, { fontSize: 16 })}>
                {cx.kind === "dup" ? "Marcar como contestada" : "Marcar como cancelada"}
              </button>
              <button onClick={() => go("assistente")} style={{ ...btnLink, borderRadius: 14 }}>
                Pedir ajuda ao assistente
              </button>
            </div>
          </>
        )}
        {cx && done && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "12px 0" }}>
            <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--good-soft)", color: "var(--good-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I name="savings" size={36} />
            </span>
            <h2 style={{ margin: 0, ...nunito(24) }}>{cx.kind === "dup" ? `Pronto! ${brl(cx.amount, true)} em contestação` : `Pronto! ${brl(cx.amount, true)}/mês de volta`}</h2>
            <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5, textWrap: "pretty" } as CSSProperties}>{cx.kind === "dup" ? "Vamos conferir nas próximas faturas se o estorno chegou." : `${cx.name} sai do seu plano a partir do mês que vem. Vamos conferir na próxima fatura se a cobrança parou de vir.`}</p>
            <div style={{ width: "100%", padding: 14, borderRadius: 16, background: "var(--surface2)", display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>Recuperado no total</span>
              <b style={{ color: "var(--good-t)" }}>{brl(tot.saved, true)}/mês</b>
            </div>
            <button onClick={() => setCxId(null)} style={btnPrimary(52, { width: "100%", fontSize: 16 })}>
              Continuar revisando
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

// ---------------- Check-in de assinaturas ----------------
function Checkin({ ctx }: { ctx: Context }) {
  const { plan, go } = useApp();
  const month = monthKey(ctx.today);
  const all = ctx.data.subscriptions.filter((s) => s.signal || s.checkinMonth === month);
  const queue = all.filter((s) => s.checkinMonth !== month);
  const answered = all.length - queue.length;
  const cur = queue[0];
  const [dx, setDx] = useState<number | null>(null);
  const x0 = useRef(0);
  const answer = useAction((v: { id: string; used: boolean }) => api("POST", `/api/subscriptions/${v.id}/checkin`, { used: v.used }));
  const reset = useAction(() => api("POST", "/api/subscriptions/checkin/reset"));
  const notUsed = useMemo(() => all.filter((s) => s.checkinMonth === month && s.checkin === "nao_usei"), [all, month]);
  if (!hasFeature(plan, "checkin")) return <Paywall need="plus" headline={`${queue.length || all.length} assinaturas esperando seu check-in`} detail="Leva menos de um minuto e costuma achar pelo menos uma que você esqueceu." />;
  if (!all.length) return <Empty icon="style" title="Nenhuma assinatura para revisar" text="Quando encontrarmos assinaturas nos seus extratos, elas aparecem aqui." />;
  const respond = (used: boolean) => {
    if (!cur || answer.isPending) return;
    setDx(null);
    answer.mutate({ id: cur.id, used });
  };
  if (!cur)
    return (
      <div style={{ maxWidth: 440, width: "100%", margin: "0 auto", padding: 28, ...card(24, 28), display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
        <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--good-soft)", color: "var(--good-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name="task_alt" size={32} />
        </span>
        <h2 style={{ margin: 0, ...nunito(24) }}>Check-in feito</h2>
        <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5 }}>{notUsed.length ? `Você marcou ${notUsed.length} como não usadas: ${notUsed.map((s) => s.name).join(", ")}. Somam ${brl(notUsed.reduce((a, s) => a + s.amount, 0), true)}/mês.` : "Você usa todas. Ótimo — fazemos de novo no mês que vem."}</p>
        <button onClick={() => go("gastos", "vazamentos")} style={btnPrimary(48)}>
          Ver no caçador de vazamentos
        </button>
        <button onClick={() => reset.mutate(undefined)} style={btnLink}>
          Refazer check-in
        </button>
      </div>
    );
  const x = dx ?? 0;
  return (
    <div style={{ maxWidth: 440, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800 }}>Check-in de assinaturas</span>
        <span style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 700 }}>
          {answered + 1} de {all.length}
        </span>
      </div>
      <div role="progressbar" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={all.length} style={{ height: 6, borderRadius: 3, background: "var(--surface2)" }}>
        <div style={{ width: `${(answered / all.length) * 100}%`, height: "100%", borderRadius: 3, background: "var(--brand)", transition: "width .3s" }} />
      </div>
      <div style={{ position: "relative", height: 380 }}>
        <div style={{ position: "absolute", inset: "24px 24px -8px", borderRadius: 28, background: "var(--surface2)", border: "1px solid var(--line)" }} />
        <div style={{ position: "absolute", inset: "12px 12px 4px", borderRadius: 28, background: "var(--surface)", border: "1px solid var(--line)", opacity: 0.8 }} />
        <article
          key={cur.id}
          onTouchStart={(e) => {
            x0.current = e.touches[0].clientX;
            setDx(0);
          }}
          onTouchMove={(e) => setDx(e.touches[0].clientX - x0.current)}
          onTouchEnd={() => {
            if (x > 90) respond(true);
            else if (x < -90) respond(false);
            else setDx(null);
          }}
          style={{ position: "absolute", inset: "0 0 16px", borderRadius: 28, background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)", padding: 24, display: "flex", flexDirection: "column", gap: 14, transform: `translateX(${x}px) rotate(${(x / 20).toFixed(1)}deg)`, transition: dx == null ? "transform .25s ease" : "none", animation: "pp-up .2s ease" }}
        >
          <span aria-hidden style={{ width: 64, height: 64, borderRadius: 18, background: "var(--accent-soft)", color: "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22 }}>
            {cur.monogram}
          </span>
          <div>
            <div style={nunito(28)}>{cur.name}</div>
            <div style={{ color: "var(--ink2)" }}>
              {brl(cur.amount, true)}/mês · {cur.accountLabel}
            </div>
          </div>
          {cur.signal && (
            <div style={{ padding: 12, borderRadius: 14, background: "var(--surface2)", fontSize: 14, lineHeight: 1.45, display: "flex", gap: 8 }}>
              <I name={cur.signalIcon || "info"} size={20} style={{ color: "var(--ink3)" }} />
              <span>{cur.signal}</span>
            </div>
          )}
          <div style={{ marginTop: "auto", fontSize: 15, fontWeight: 700 }}>Você usou isso no último mês?</div>
        </article>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button onClick={() => respond(false)} style={{ minHeight: 56, borderRadius: 16, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <I name="close" />
          Não usei
        </button>
        <button onClick={() => respond(true)} style={btnPrimary(56, { borderRadius: 16, fontSize: 16 })}>
          <I name="check" />
          Usei este mês
        </button>
      </div>
      <div style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>Também dá para deslizar: direita = usei, esquerda = não usei.</div>
    </div>
  );
}
