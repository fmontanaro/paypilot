// Componentes do design system (design_guidelines.md › Componentes).
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { PAYWALL_FEATS, PLAN_NAMES } from "@shared/plans";
import { useApp } from "@/lib/app";

export type Tone = "brand" | "accent" | "warn" | "risk" | "good" | "muted";

export const TONE: Record<Tone, { fg: string; bg: string; solid: string }> = {
  brand: { fg: "var(--brand-t)", bg: "var(--brand-soft)", solid: "var(--brand)" },
  accent: { fg: "var(--accent-t)", bg: "var(--accent-soft)", solid: "var(--accent)" },
  warn: { fg: "var(--warn-t)", bg: "var(--warn-soft)", solid: "var(--warn)" },
  risk: { fg: "var(--risk-t)", bg: "var(--risk-soft)", solid: "var(--risk)" },
  good: { fg: "var(--good-t)", bg: "var(--good-soft)", solid: "var(--good)" },
  muted: { fg: "var(--ink3)", bg: "var(--surface2)", solid: "var(--ink2)" },
};

export function I({ name, size, fill, style, label }: { name: string; size?: number; fill?: boolean; style?: CSSProperties; label?: string }) {
  return (
    <i className="ms" aria-hidden={label ? undefined : true} aria-label={label} style={{ fontSize: size, fontVariationSettings: fill ? "'FILL' 1" : undefined, ...style }}>
      {name}
    </i>
  );
}

export const card = (radius = 22, pad: number | string = 18): CSSProperties => ({ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: radius, padding: pad });
export const col = (gap = 16): CSSProperties => ({ display: "flex", flexDirection: "column", gap });
export const row = (gap = 12, align: CSSProperties["alignItems"] = "center"): CSSProperties => ({ display: "flex", gap, alignItems: align });
export const h2: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 800 };
export const nunito = (size: number, weight = 900): CSSProperties => ({ fontFamily: "Nunito,sans-serif", fontWeight: weight, fontSize: size });
export const eyebrow = (color = "var(--ink3)"): CSSProperties => ({ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: ".05em" });

export const btnPrimary = (h = 50, extra: CSSProperties = {}): CSSProperties => ({ minHeight: h, padding: "0 18px", borderRadius: 14, border: 0, background: "var(--brand)", color: "var(--brand-on)", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...extra });
export const btnSecondary = (h = 50, extra: CSSProperties = {}): CSSProperties => ({ minHeight: h, padding: "0 18px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...extra });
export const btnLink: CSSProperties = { minHeight: 44, border: 0, background: "none", color: "var(--brand-t)", fontWeight: 800, fontSize: 14 };
export const input = (h = 48, extra: CSSProperties = {}): CSSProperties => ({ width: "100%", minWidth: 0, minHeight: h, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", padding: "0 12px", fontWeight: 700, color: "var(--ink)", ...extra });
export const labelCol: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontWeight: 800 };
export const check: CSSProperties = { width: 24, height: 24, accentColor: "var(--brand)", flex: "none" };

/** Abas em pílula (selecionada com fundo --ink). */
export function PillTabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; icon?: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="pp-scroll-x" style={{ display: "flex", gap: 8, overflowX: "auto", padding: 2 }}>
      {tabs.map((t) => {
        const sel = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={sel} onClick={() => onChange(t.id)} style={{ flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 999, border: `1px solid ${sel ? "var(--ink)" : "var(--line)"}`, background: sel ? "var(--ink)" : "var(--surface)", color: sel ? "var(--bg)" : "var(--ink2)", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            {t.icon && <I name={t.icon} size={18} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Controle segmentado (fundo --surface2, opção ativa em --surface com sombra). */
export function Segmented<T extends string>({ options, value, onChange, role = "tablist", label, h = 44 }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void; role?: "tablist" | "radiogroup"; label?: string; h?: number }) {
  return (
    <div role={role} aria-label={label} style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))`, gap: 4, padding: 4, borderRadius: 14, background: "var(--surface2)" }}>
      {options.map((o) => {
        const sel = o.id === value;
        return (
          <button key={o.id} role={role === "tablist" ? "tab" : "radio"} aria-selected={role === "tablist" ? sel : undefined} aria-checked={role === "radiogroup" ? sel : undefined} onClick={() => onChange(o.id)} style={{ minHeight: h, border: 0, borderRadius: 10, background: sel ? "var(--surface)" : "transparent", boxShadow: sel ? "var(--shadow)" : "none", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Barra de progresso com marcador opcional (ritmo esperado, renda). */
export function Bar({ pct, color = "var(--brand)", h = 12, track = "var(--surface2)", marker, aria, transition }: { pct: number; color?: string; h?: number; track?: string; marker?: number; aria?: string; transition?: boolean }) {
  return (
    <div role={aria ? "img" : undefined} aria-label={aria} style={{ position: "relative", height: h, borderRadius: h / 2, background: track }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct * 100)).toFixed(1)}%`, height: "100%", borderRadius: h / 2, background: color, transition: transition ? "width .35s ease" : undefined }} />
      {marker != null && <div title="Ritmo esperado para hoje" style={{ position: "absolute", left: `${(marker * 100).toFixed(1)}%`, top: -4, bottom: -4, width: 3, borderRadius: 2, background: "var(--ink)" }} />}
    </div>
  );
}

export function MarkerLegend({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink3)" }}>
      <span style={{ width: 3, height: 12, background: "var(--ink)", borderRadius: 2 }} />
      {text}
    </div>
  );
}

/** Quadrado com iniciais na cor do banco (placeholder até os logos oficiais). */
export function BankMark({ m, c, tc = "#fff", size = 44, radius = 12, font = 14 }: { m: string; c: string; tc?: string; size?: number; radius?: number; font?: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: radius, background: c, color: tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: font, flex: "none" }}>
      {m}
    </span>
  );
}

export const LOGO_BG = (pos = "50% 18%/155%") => `#0B6B3A url(/logo.png) ${pos} no-repeat`;

export function Logo({ size = 40, radius = 12, border }: { size?: number; radius?: number; border?: string }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: radius, background: LOGO_BG(), flex: "none", display: "inline-block", border }} />;
}

export function Spinner({ size = 22, color = "var(--brand-t)" }: { size?: number; color?: string }) {
  return <I name="progress_activity" size={size} style={{ color, animation: "pp-spin 1s linear infinite" }} />;
}

/** Bottom sheet no mobile; painel lateral direito no tablet e desktop. */
export function Sheet({ open, onClose, label, width = 440, children }: { open: boolean; onClose: () => void; label: string; width?: number; children: ReactNode }) {
  const { bp } = useApp();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  const m = bp === "mobile";
  const box: CSSProperties = m
    ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61, maxHeight: "92vh", overflowY: "auto", background: "var(--surface)", borderRadius: "24px 24px 0 0", padding: "8px 20px calc(24px + env(safe-area-inset-bottom))", boxShadow: "var(--shadow)", animation: "pp-sheet .22s ease" }
    : { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61, width: `min(${width}px,100vw)`, overflowY: "auto", background: "var(--surface)", padding: "24px 28px", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow)", animation: "pp-up .2s ease" };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 60 }} />
      <div role="dialog" aria-modal="true" aria-label={label} style={box}>
        {m && <div style={{ width: 40, height: 5, borderRadius: 3, background: "var(--line)", margin: "4px auto 12px" }} />}
        {children}
      </div>
    </>
  );
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Fechar" style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--surface2)", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <I name="close" />
    </button>
  );
}

/** Bloqueio elegante com prévia real do valor. */
export function Paywall({ need, headline, detail, teaser }: { need: "plus" | "pilot"; headline: string; detail: string; teaser?: { a: string; b: string }[] }) {
  const { go } = useApp();
  const name = PLAN_NAMES[need];
  const t = teaser || [
    { a: "Rota A", b: "R$ 1.020" },
    { a: "Rota B", b: "R$ 0" },
    { a: "Rota C", b: "R$ 285" },
  ];
  return (
    <div style={{ position: "relative", minHeight: 540, borderRadius: 24, overflow: "hidden", border: "1px solid var(--line)", background: "var(--surface)" }}>
      <div aria-hidden style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, filter: "blur(6px)", opacity: 0.75, pointerEvents: "none", userSelect: "none" }}>
        {t.map((x, k) => (
          <div key={k} style={{ padding: 18, borderRadius: 18, border: "1px solid var(--line)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>{x.a}</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{x.b}</div>
            <div style={{ height: 10, borderRadius: 5, background: "var(--brand-soft)" }} />
            <div style={{ height: 10, width: "70%", borderRadius: 5, background: "var(--line)" }} />
            <div style={{ height: 10, width: "50%", borderRadius: 5, background: "var(--line)" }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ maxWidth: 440, width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand-t)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>
            <I name="lock" size={16} />
            Recurso do plano {name}
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>Prévia com os seus dados</div>
          <h2 style={{ margin: 0, ...nunito(24), lineHeight: 1.2, textWrap: "pretty" } as CSSProperties}>{headline}</h2>
          <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5, textWrap: "pretty" } as CSSProperties}>{detail}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {PAYWALL_FEATS[need].map((f) => (
              <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
                <I name="check_circle" size={20} style={{ color: "var(--good-t)" }} />
                {f}
              </li>
            ))}
          </ul>
          <button onClick={() => go("perfil", "planos")} style={btnPrimary(50)}>
            Assinar o {name} · R$ XX/mês
          </button>
          <button onClick={() => go("perfil", "planos")} style={{ ...btnLink, borderRadius: 14 }}>
            Comparar planos
          </button>
          <div style={{ fontSize: 12, color: "var(--ink3)", textAlign: "center" }}>Sem fidelidade. Cancele quando quiser. Não vendemos crédito.</div>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ h, span }: { h: number; span: number }) {
  return <div style={{ gridColumn: `span ${span}`, height: h, borderRadius: 20, background: "linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%)", backgroundSize: "200% 100%", animation: "pp-shimmer 1.4s linear infinite", border: "1px solid var(--line)" }} />;
}

/** Aviso de erro com ação de recuperação. */
export function ErrorNote({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <div role="alert" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", padding: "14px 16px", borderRadius: 16, background: "var(--warn-soft)", color: "var(--ink)" }}>
      <I name="sync_problem" style={{ color: "var(--warn-t)" }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--ink2)", marginTop: 2 }}>{text}</div>
      </div>
      {action && (
        <button onClick={onAction} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--warn-t)", background: "none", color: "var(--warn-t)", fontWeight: 800 }}>
          {action}
        </button>
      )}
    </div>
  );
}

/** Seção de título + total usada em listas. */
export function SectionHead({ icon, title, right }: { icon?: string; title: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", alignItems: "baseline", gap: 8 }}>
      <h2 style={{ ...h2, display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <I name={icon} size={20} style={{ color: "var(--ink3)" }} />}
        {title}
      </h2>
      {right != null && <span style={{ fontSize: 14, fontWeight: 800 }}>{right}</span>}
    </div>
  );
}

export function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div style={{ padding: "40px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: 20 }}>
      <I name={icon} size={36} style={{ color: "var(--ink3)" }} />
      <b>{title}</b>
      <span style={{ color: "var(--ink3)", fontSize: 14 }}>{text}</span>
    </div>
  );
}
