// Shell do app (PayPilot.dc.html): sidebar no desktop, rail no tablet, barra inferior no mobile,
// header com kicker + título, tema, assistente em painel/gaveta e puxar para atualizar.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initials, longDay, monthTitle } from "@shared/format";
import { PLAN_NAMES } from "@shared/plans";
import { api, useCtx } from "@/lib/api";
import { applyTheme, resolveTheme, useApp, type ThemePref } from "@/lib/app";
import { I, Logo, LOGO_BG } from "@/ui";
import Assistente from "@/screens/Assistente";

const NAV = [
  { id: "inicio", label: "Início", icon: "home" },
  { id: "gastos", label: "Gastos", icon: "receipt_long" },
  { id: "plano", label: "Plano", icon: "route" },
  { id: "metas", label: "Metas", icon: "flag" },
  { id: "contas", label: "Contas", icon: "account_balance" },
];

export function useThemeToggle() {
  const { user } = useApp();
  const qc = useQueryClient();
  const pref = (user?.prefs?.theme || "claro") as ThemePref;
  const [cur, setCur] = useState<ThemePref>(() => {
    try {
      return (localStorage.getItem("pp-theme") as ThemePref) || pref;
    } catch {
      return pref;
    }
  });
  useEffect(() => setCur(pref), [pref]);
  useEffect(() => applyTheme(cur), [cur]);
  const set = (t: ThemePref) => {
    setCur(t);
    applyTheme(t);
    if (user) void api("PATCH", "/api/me", { prefs: { theme: t } }).then(() => qc.invalidateQueries({ queryKey: ["me"] }));
  };
  const name = resolveTheme(cur);
  return { pref: cur, name, set, toggle: () => set(name === "escuro" ? "claro" : "escuro") };
}

export default function Shell({ children }: { children: ReactNode }) {
  const { bp, w, route, sub, go, user, plan } = useApp();
  const { ctx, refetch } = useCtx();
  const theme = useThemeToggle();
  const [panel, setPanel] = useState<boolean | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const y0 = useRef<number | null>(null);
  const isD = bp === "desktop",
    isT = bp === "tablet",
    isM = bp === "mobile";
  const panelOpen = panel ?? w >= 1280;
  const chatFull = route === "assistente";
  const name = user?.name || "";
  const first = name.split(" ")[0];
  const ini = name ? initials(name) : (user?.email || user?.phone || "?").slice(0, 2).toUpperCase();
  const today = ctx?.today ?? new Date();

  // Puxar para atualizar (mobile).
  useEffect(() => {
    if (!isM) return;
    const ts = (e: TouchEvent) => {
      y0.current = window.scrollY <= 0 && !["assistente", "onb"].includes(route) ? e.touches[0].clientY : null;
    };
    const tm = (e: TouchEvent) => {
      if (y0.current == null || refreshing) return;
      const d = e.touches[0].clientY - y0.current;
      if (d > 0) setPull(Math.min(84, d * 0.45));
    };
    const te = () => {
      if (y0.current == null) return;
      y0.current = null;
      setPull((p) => {
        if (p >= 56) {
          setRefreshing(true);
          const conns = ctx?.data.connections ?? [];
          void Promise.all(conns.map((c) => api("POST", `/api/connections/${c.id}/sync`).catch(() => null)))
            .then(() => refetch())
            .finally(() => {
              setRefreshing(false);
              setPull(0);
            });
          return 52;
        }
        return 0;
      });
    };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });
    window.addEventListener("touchend", te);
    return () => {
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", te);
    };
  }, [isM, route, refreshing, ctx, refetch]);

  const TITLES: Record<string, [string, string]> = {
    inicio: [longDay(today), first ? `Olá, ${first}` : "Olá!"],
    gastos: [monthTitle(today), "Gastos"],
    plano: [monthTitle(today), "Plano"],
    metas: ["Seus objetivos", "Metas"],
    contas: ["Dados, cartões e dívidas", "Contas"],
    assistente: ["Responde só sobre as suas finanças", "Assistente"],
    perfil: sub === "planos" ? ["Assinatura", "Planos"] : [name || "Sua conta", "Perfil e configurações"],
  };
  const [kicker, title] = TITLES[route] || TITLES.inicio;
  const phase = ctx?.phases.find((p) => p.current);

  const navItem = (n: (typeof NAV)[number]) => {
    const on = route === n.id;
    return { on, bg: on ? "var(--brand-soft)" : "transparent", fg: on ? "var(--brand-t)" : "var(--ink2)", weight: on ? 800 : 600 };
  };

  const headerBox: CSSProperties = isM
    ? { position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "calc(10px + env(safe-area-inset-top)) 16px 10px", background: "color-mix(in oklab, var(--bg) 90%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }
    : { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: isT ? "22px 28px 6px" : "28px 36px 6px", maxWidth: 1240, width: "100%", margin: "0 auto" };
  const contentBox: CSSProperties = isM ? (chatFull ? { padding: 0 } : { padding: "8px 16px calc(112px + env(safe-area-inset-bottom))" }) : isT ? { padding: "16px 28px 48px", width: "100%" } : { padding: "18px 36px 56px", maxWidth: 1240, width: "100%", margin: "0 auto" };

  const avatar = (size: number, font = 14): CSSProperties => ({ width: size, height: size, borderRadius: "50%", border: 0, background: "var(--accent-soft)", color: "var(--accent-t)", fontWeight: 800, fontSize: font, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", minHeight: "100vh" }}>
        {isD && (
          <nav aria-label="Navegação principal" style={{ position: "sticky", top: 0, height: "100vh", width: 236, flex: "none", display: "flex", flexDirection: "column", gap: 4, padding: "20px 14px", borderRight: "1px solid var(--line)", background: "var(--surface)", overflowY: "auto" }}>
            <button onClick={() => go("inicio")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px", border: 0, background: "none", textAlign: "left" }}>
              <Logo size={40} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "-.01em" }}>PayPilot</span>
            </button>
            {NAV.map((n) => {
              const s = navItem(n);
              return (
                <button key={n.id} onClick={() => go(n.id)} aria-current={s.on ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "0 12px", border: 0, borderRadius: 12, background: s.bg, color: s.fg, fontWeight: s.weight, fontSize: 15, textAlign: "left" }}>
                  <I name={n.icon} fill={s.on} />
                  {n.label}
                </button>
              );
            })}
            <div style={{ height: 1, background: "var(--line)", margin: "10px 8px" }} />
            <button onClick={() => setPanel(!panelOpen)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "0 12px", border: 0, borderRadius: 12, background: panelOpen ? "var(--surface2)" : "transparent", color: "var(--ink2)", fontWeight: 600, fontSize: 15, textAlign: "left" }}>
              <I name="forum" />
              Assistente
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink3)" }}>{panelOpen ? "aberto" : "fechado"}</span>
            </button>
            {[
              { s: "planos", label: "Planos", icon: "workspace_premium" },
              { s: "", label: "Configurações", icon: "settings" },
            ].map((n) => {
              const on = route === "perfil" && sub === n.s;
              return (
                <button key={n.label} onClick={() => go("perfil", n.s)} aria-current={on ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "0 12px", border: 0, borderRadius: 12, background: on ? "var(--brand-soft)" : "transparent", color: on ? "var(--brand-t)" : "var(--ink2)", fontWeight: on ? 800 : 600, fontSize: 15, textAlign: "left" }}>
                  <I name={n.icon} />
                  {n.label}
                </button>
              );
            })}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: 16 }}>
              <div style={{ padding: 14, borderRadius: 16, background: "var(--brand-soft)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-t)", textTransform: "uppercase", letterSpacing: ".06em" }}>Plano {PLAN_NAMES[plan]}</div>
                <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4, lineHeight: 1.4 }}>{phase ? `Fase ${phase.n} de 4 · ${phase.label}` : "Conecte seus dados para começar"}</div>
              </div>
              <button onClick={() => go("perfil")} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, border: 0, borderRadius: 12, background: "none", textAlign: "left" }}>
                <span style={avatar(36)}>{ini}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || user?.email || user?.phone}</span>
                  <span style={{ fontSize: 12, color: "var(--ink3)" }}>Perfil e configurações</span>
                </span>
              </button>
            </div>
          </nav>
        )}
        {isT && (
          <nav aria-label="Navegação principal" style={{ position: "sticky", top: 0, height: "100vh", width: 80, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 8px", borderRight: "1px solid var(--line)", background: "var(--surface)" }}>
            <button onClick={() => go("inicio")} aria-label="PayPilot, início" style={{ width: 44, height: 44, borderRadius: 12, border: 0, background: LOGO_BG(), marginBottom: 12 }} />
            {NAV.map((n) => {
              const s = navItem(n);
              return (
                <button key={n.id} onClick={() => go(n.id)} aria-label={n.label} aria-current={s.on ? "page" : undefined} style={{ width: 60, minHeight: 52, border: 0, borderRadius: 14, background: s.bg, color: s.fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 11, fontWeight: 700 }}>
                  <I name={n.icon} fill={s.on} />
                  {n.label}
                </button>
              );
            })}
            <button onClick={() => setDrawer(true)} aria-label="Abrir assistente" style={{ width: 52, height: 52, borderRadius: "50%", border: 0, background: "var(--brand)", color: "var(--brand-on)", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)" }}>
              <I name="forum" />
            </button>
            <button onClick={() => go("perfil")} aria-label="Perfil" style={{ ...avatar(44), marginTop: "auto" }}>
              {ini}
            </button>
          </nav>
        )}
        <main style={{ flex: 1, minWidth: 0, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {isM && pull > 0 && (
            <div style={{ height: pull, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--brand-t)", fontSize: 13, fontWeight: 700, paddingTop: "env(safe-area-inset-top)" }}>
              <I name="progress_activity" style={{ animation: refreshing ? "pp-spin 1s linear infinite" : "none", transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }} />
              {refreshing ? "Atualizando suas contas…" : pull >= 56 ? "Solte para atualizar" : "Puxe para atualizar"}
            </div>
          )}
          {!(isM && chatFull) && (
            <header style={headerBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                {isM && route === "inicio" && <Logo size={40} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink3)", fontWeight: 600, whiteSpace: "nowrap" }}>{kicker}</div>
                  <h1 style={{ margin: 0, fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: isD ? 32 : isM ? (route === "inicio" ? 22 : 26) : 28, letterSpacing: "-.01em", lineHeight: 1.15 }}>{title}</h1>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "none" }}>
                <button onClick={theme.toggle} aria-label="Alternar modo claro e escuro" style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I name={theme.name === "escuro" ? "light_mode" : "dark_mode"} />
                </button>
                {isM && (
                  <button onClick={() => go("perfil")} aria-label="Perfil e configurações" style={avatar(44)}>
                    {ini}
                  </button>
                )}
              </div>
            </header>
          )}
          <div style={contentBox}>{children}</div>
        </main>
        {isD && panelOpen && !chatFull && (
          <aside aria-label="Assistente" style={{ position: "sticky", top: 0, height: "100vh", width: 368, flex: "none", borderLeft: "1px solid var(--line)", background: "var(--surface)" }}>
            <Assistente mode="panel" onClose={() => setPanel(false)} />
          </aside>
        )}
      </div>
      {isD && !panelOpen && !chatFull && (
        <button onClick={() => setPanel(true)} style={{ position: "fixed", right: 24, bottom: 24, zIndex: 45, display: "flex", alignItems: "center", gap: 8, height: 52, padding: "0 20px 0 16px", border: 0, borderRadius: 26, background: "var(--brand)", color: "var(--brand-on)", fontWeight: 800, fontSize: 15, boxShadow: "var(--shadow)" }}>
          <I name="forum" />
          Assistente
        </button>
      )}
      {isM && !chatFull && (
        <nav aria-label="Navegação principal" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "6px 6px calc(6px + env(safe-area-inset-bottom))", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr)) 72px repeat(3,minmax(0,1fr))", alignItems: "center" }}>
          {NAV.slice(0, 2).map((n) => (
            <BottomItem key={n.id} n={n} {...navItem(n)} onClick={() => go(n.id)} />
          ))}
          <button onClick={() => go("assistente")} aria-label="Abrir assistente" style={{ justifySelf: "center", width: 58, height: 58, marginTop: -26, borderRadius: "50%", border: "4px solid var(--bg)", background: "var(--brand)", color: "var(--brand-on)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)" }}>
            <I name="forum" size={26} />
          </button>
          {NAV.slice(2).map((n) => (
            <BottomItem key={n.id} n={n} {...navItem(n)} onClick={() => go(n.id)} />
          ))}
        </nav>
      )}
      {isT && drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 60 }} />
          <aside aria-label="Assistente" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px,100vw)", zIndex: 61, background: "var(--surface)", boxShadow: "var(--shadow)", animation: "pp-up .2s ease" }}>
            <Assistente mode="panel" onClose={() => setDrawer(false)} />
          </aside>
        </>
      )}
    </div>
  );
}

function BottomItem({ n, on, bg, fg, weight, onClick }: { n: (typeof NAV)[number]; on: boolean; bg: string; fg: string; weight: number; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={on ? "page" : undefined} style={{ minHeight: 52, border: 0, background: "none", color: fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 11, fontWeight: weight }}>
      <span style={{ width: 52, height: 28, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <I name={n.icon} fill={on} />
      </span>
      {n.label}
    </button>
  );
}
