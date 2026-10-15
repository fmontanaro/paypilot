// Estado global do app: breakpoint, rota, tema, plano e toast.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { PlanId } from "@shared/plans";
import { PLAN_RANK } from "@shared/plans";
import type { PublicUser } from "@shared/schema";

export type Bp = "mobile" | "tablet" | "desktop";

export function useWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

export const bpOf = (w: number): Bp => (w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop");

export type ThemePref = "claro" | "escuro" | "sistema";

export function resolveTheme(t: ThemePref): "claro" | "escuro" {
  if (t === "sistema") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  return t;
}

export function applyTheme(t: ThemePref) {
  document.documentElement.setAttribute("data-theme", resolveTheme(t));
  try {
    localStorage.setItem("pp-theme", t);
  } catch {
    /* sem armazenamento local */
  }
}

interface AppCtx {
  bp: Bp;
  w: number;
  route: string;
  sub: string;
  go: (route: string, sub?: string) => void;
  user: PublicUser | null;
  plan: PlanId;
  rank: number;
  toast: (t: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do AppProvider");
  return c;
}

export function AppProvider({ user, children }: { user: PublicUser | null; children: ReactNode }) {
  const w = useWidth();
  const [loc, setLoc] = useLocation();
  const [, route = "", sub = ""] = loc.split("/");
  const [toastText, setToast] = useState("");
  const timer = useRef<number>();
  const go = useCallback(
    (r: string, s = "") => {
      const path = "/" + [r, s].filter(Boolean).join("/");
      try {
        if (r !== "onb") localStorage.setItem("pp-route", path);
      } catch {
        /* sem armazenamento local */
      }
      setLoc(path);
      window.scrollTo(0, 0);
    },
    [setLoc],
  );
  const toast = useCallback((t: string) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);
  const plan = ((user?.plan as PlanId) || "gratis") as PlanId;
  const value = useMemo<AppCtx>(() => ({ bp: bpOf(w), w, route, sub, go, user, plan, rank: PLAN_RANK[plan], toast }), [w, route, sub, go, user, plan, toast]);
  const bp = bpOf(w);
  return (
    <Ctx.Provider value={value}>
      {children}
      {toastText && (
        <div role="status" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: bp === "mobile" && route !== "assistente" && route !== "onb" ? "calc(96px + env(safe-area-inset-bottom))" : 32, zIndex: 70, maxWidth: "min(92vw,460px)", padding: "12px 16px", borderRadius: 14, background: "var(--ink)", color: "var(--bg)", fontWeight: 700, fontSize: 14, boxShadow: "var(--shadow)", display: "flex", gap: 8, alignItems: "center", animation: "pp-up .2s ease" }}>
          <i className="ms" style={{ fontSize: 20 }} aria-hidden>
            check_circle
          </i>
          {toastText}
        </div>
      )}
    </Ctx.Provider>
  );
}
