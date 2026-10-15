// Assistente (Assistente.dc.html): chat com cards ricos, áudio, foto e configuração do WhatsApp.
// Responde só sobre as finanças do usuário; os números dos cards vêm do motor financeiro.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@shared/schema";
import { catColor, catSoft, category, PICKABLE } from "@shared/categories";
import { brl } from "@shared/format";
import { FREE_CHAT_LIMIT, hasFeature } from "@shared/plans";
import { api, ApiError, readFileAsBase64, useSnapshot } from "@/lib/api";
import { useApp } from "@/lib/app";
import { btnPrimary, check, I, LOGO_BG, nunito, Paywall } from "@/ui";

type Card = Record<string, any>;
const CHIPS = ["Comprei um suco de R$ 12,90", "Quanto falta no meu teto de Uber?", "Posso gastar R$ 600 num jantar sábado?", "O que vence esta semana?"];
const WAVE = [8, 14, 20, 12, 18, 22, 10, 16, 20, 8, 14, 18, 22, 12, 8, 16, 20, 10, 14, 8];

export default function Assistente({ mode = "full", onClose }: { mode?: "full" | "panel"; onClose?: () => void }) {
  const { bp, go, sub, plan, toast } = useApp();
  const qc = useQueryClient();
  const panel = mode === "panel";
  const isM = bp === "mobile";
  const split = !panel && bp === "desktop";
  const [waView, setWaView] = useState(sub === "whatsapp");
  useEffect(() => setWaView(sub === "whatsapp"), [sub]);
  const waOnly = !split && waView && !panel;
  const msgsQ = useQuery<ChatMessage[]>({ queryKey: ["chat"], queryFn: () => api("GET", "/api/assistant/messages") });
  const snap = useSnapshot();
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [picking, setPicking] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const secsRef = useRef(0);
  const recRef = useRef<{ mr: MediaRecorder; chunks: Blob[]; timer: number; cancel: boolean } | null>(null);
  const msgs = [...(msgsQ.data || []), ...pending];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) setTimeout(() => (el.scrollTop = el.scrollHeight), 30);
  }, [msgs.length, typing]);

  const chatCount = snap.data?.chatCount ?? 0;
  const left = FREE_CHAT_LIMIT - chatCount;

  const send = async (body: Record<string, unknown>, optimistic?: ChatMessage) => {
    if (optimistic) setPending([optimistic]);
    setTyping(true);
    try {
      await api("POST", "/api/assistant/messages", body);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Não consegui enviar agora.");
    } finally {
      await qc.invalidateQueries({ queryKey: ["chat"] });
      setPending([]);
      setTyping(false);
      void qc.invalidateQueries({ queryKey: ["snapshot"] });
    }
  };
  const fake = (kind: string, t: string | null, card: Card | null = null): ChatMessage => ({ id: "tmp", userId: "", role: "me", kind, text: t, card, channel: "app", createdAt: new Date() });
  const sendText = (t: string) => {
    const v = t.trim();
    if (!v) return;
    setText("");
    void send({ text: v }, fake("text", v));
  };
  const action = async (id: string, act: string, payload?: Record<string, unknown>) => {
    try {
      await api("POST", "/api/assistant/actions", { messageId: id, action: act, payload });
      await qc.invalidateQueries({ queryKey: ["chat"] });
      void qc.invalidateQueries({ queryKey: ["snapshot"] });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const startRec = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast("Este navegador não grava áudio. Escreva o gasto.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const st = { mr, chunks: [] as Blob[], timer: 0, cancel: false };
      mr.ondataavailable = (e) => e.data.size && st.chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(st.timer);
        if (st.cancel) return;
        const blob = new Blob(st.chunks, { type: mr.mimeType || "audio/webm" });
        const base64 = await readFileAsBase64(blob);
        const seconds = Math.max(1, Math.round(blob.size ? secsRef.current : 1));
        void send({ audio: { base64, mime: blob.type, seconds } }, fake("audio", null, { dur: `0:${String(seconds).padStart(2, "0")}` }));
      };
      recRef.current = st;
      setSecs(0);
      secsRef.current = 0;
      st.timer = window.setInterval(() => setSecs((s) => (secsRef.current = s + 1)), 1000);
      mr.start();
      setRec(true);
    } catch {
      toast("Sem acesso ao microfone. Libere nas configurações do navegador.");
    }
  };
  const stopRec = (cancel: boolean) => {
    const st = recRef.current;
    if (!st) return;
    st.cancel = cancel;
    st.mr.stop();
    recRef.current = null;
    setRec(false);
  };
  const onPhoto = async (f?: File) => {
    if (!f) return;
    const base64 = await readFileAsBase64(f);
    void send({ photo: { base64, mime: f.type || "image/jpeg" } }, fake("photo", null));
  };

  const wrap: CSSProperties = panel ? { height: "100%", display: "flex", flexDirection: "column" } : isM ? { height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" } : split ? { display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16, height: "calc(100vh - 150px)", minHeight: 560 } : { display: "flex", flexDirection: "column", height: waOnly ? "auto" : "calc(100vh - 140px)", minHeight: 520 };
  const chatBox: CSSProperties = waOnly ? { display: "none" } : panel || isM ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 24, overflow: "hidden" };
  const inputBox: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: isM && !panel ? "8px 12px calc(10px + env(safe-area-inset-bottom))" : "8px 12px 12px", background: "var(--surface)", borderTop: "1px solid var(--line)" };

  return (
    <div style={wrap}>
      <div style={chatBox}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: isM && !panel ? "calc(8px + env(safe-area-inset-top)) 12px 8px" : "12px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
          {!panel && isM && (
            <button onClick={() => go("inicio")} aria-label="Voltar" style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "none", flex: "none" }}>
              <I name="arrow_back" />
            </button>
          )}
          <span aria-hidden style={{ width: 40, height: 40, borderRadius: "50%", background: LOGO_BG("50% 18%/160%"), flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800 }}>Assistente PayPilot</div>
            <div style={{ fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plan === "gratis" ? `Plano Grátis · ${chatCount} de ${FREE_CHAT_LIMIT} mensagens no mês` : "Texto, áudio ou foto · só sobre suas finanças"}</div>
          </div>
          <button onClick={() => (panel ? go("assistente", "whatsapp") : setWaView(true))} aria-label="Configurar WhatsApp" style={{ height: 40, padding: "0 12px", borderRadius: 20, border: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, flex: "none" }}>
            <I name="chat" size={18} />
            WhatsApp
          </button>
          {panel && onClose && (
            <button onClick={onClose} aria-label="Fechar assistente" style={{ width: 40, height: 40, borderRadius: "50%", border: 0, background: "var(--surface2)", flex: "none" }}>
              <I name="close" />
            </button>
          )}
        </header>
        <div ref={scrollRef} role="log" aria-live="polite" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.length === 0 && !msgsQ.isLoading && <Bubble me={false} text="Oi! Me conte um gasto, mande um áudio ou a foto de uma nota. Também respondo sobre o seu mês e o seu plano." />}
          {msgs.map((m, k) => (
            <Msg key={m.id + k} m={m} picking={picking === m.id} setPicking={(v) => setPicking(v ? m.id : null)} action={action} go={go} />
          ))}
          {typing && (
            <div style={{ display: "flex" }}>
              <div aria-label="Digitando" style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 6px", background: "var(--surface2)", display: "flex", gap: 4 }}>
                {[0, 1, 2].map((k) => (
                  <span key={k} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink3)", animation: `pp-dots 1.2s ${k * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        {plan === "gratis" && <div style={{ padding: "0 16px 6px", fontSize: 12, color: "var(--ink3)" }}>{left > 0 ? `Restam ${left} mensagens este mês no plano Grátis.` : "Você usou as mensagens do mês no plano Grátis."}</div>}
        <div className="pp-scroll-x" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 16px 8px" }}>
          {CHIPS.map((c) => (
            <button key={c} onClick={() => sendText(c)} style={{ flex: "none", minHeight: 40, padding: "0 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              {c}
            </button>
          ))}
        </div>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => void onPhoto(e.target.files?.[0])} />
        {rec ? (
          <div style={inputBox}>
            <button onClick={() => stopRec(true)} aria-label="Descartar áudio" style={{ width: 48, height: 48, borderRadius: "50%", border: 0, background: "var(--surface2)", flex: "none" }}>
              <I name="delete" />
            </button>
            <div style={{ flex: 1, minWidth: 0, height: 48, borderRadius: 24, background: "var(--accent-soft)", display: "flex", alignItems: "center", gap: 10, padding: "0 16px", color: "var(--accent-t)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", flex: "none" }} />
              <b style={{ fontSize: 14 }}>0:{String(secs).padStart(2, "0")}</b>
              <span aria-hidden style={{ display: "flex", gap: 3, alignItems: "center", height: 24, flex: 1, overflow: "hidden" }}>
                {Array.from({ length: 22 }, (_, k) => (
                  <span key={k} style={{ width: 3, height: 22, borderRadius: 2, background: "currentColor", transformOrigin: "center", animation: `pp-wave ${0.6 + (k % 5) * 0.12}s ${k * 0.05}s ease-in-out infinite` }} />
                ))}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Gravando</span>
            </div>
            <button onClick={() => stopRec(false)} aria-label="Enviar áudio" style={{ width: 56, height: 56, borderRadius: "50%", border: 0, background: "var(--accent)", color: "#fff", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", animation: "pp-pulse 1.2s ease-out infinite" }}>
              <I name="send" />
            </button>
          </div>
        ) : (
          <div style={inputBox}>
            <button onClick={() => photoRef.current?.click()} aria-label="Enviar foto de nota ou fatura" style={{ width: 48, height: 48, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--surface)", flex: "none" }}>
              <I name="photo_camera" />
            </button>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendText(text)} placeholder="Conte um gasto ou pergunte…" aria-label="Mensagem" style={{ flex: 1, minWidth: 0, height: 48, borderRadius: 24, border: "1px solid var(--line)", background: "var(--surface2)", padding: "0 16px", fontSize: 15, outline: "none" }} />
            {text.trim() ? (
              <button onClick={() => sendText(text)} aria-label="Enviar" style={{ width: 56, height: 56, borderRadius: "50%", border: 0, background: "var(--brand)", color: "var(--brand-on)", flex: "none" }}>
                <I name="send" />
              </button>
            ) : (
              <button onClick={() => void startRec()} aria-label="Gravar áudio" style={{ width: 56, height: 56, borderRadius: "50%", border: 0, background: "var(--accent)", color: "#fff", flex: "none", boxShadow: "var(--shadow)" }}>
                <I name="mic" size={26} />
              </button>
            )}
          </div>
        )}
      </div>
      {(split || waOnly) && <WhatsApp split={split} onBack={() => (setWaView(false), sub === "whatsapp" && go("assistente"))} />}
    </div>
  );
}

function Bubble({ me, text }: { me: boolean; text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", animation: "pp-up .2s ease" }}>
      <div style={{ maxWidth: "86%", padding: "10px 14px", borderRadius: me ? "18px 18px 6px 18px" : "18px 18px 18px 6px", background: me ? "var(--brand)" : "var(--surface2)", color: me ? "var(--brand-on)" : "var(--ink)", fontSize: 15, lineHeight: 1.45, whiteSpace: "pre-line" }}>{text}</div>
    </div>
  );
}

function Msg({ m, picking, setPicking, action, go }: { m: ChatMessage; picking: boolean; setPicking: (v: boolean) => void; action: (id: string, act: string, p?: Record<string, unknown>) => void; go: (r: string, s?: string) => void }) {
  const me = m.role === "me";
  if (m.kind === "text") return <Bubble me={me} text={m.text || ""} />;
  const row: CSSProperties = { display: "flex", justifyContent: me ? "flex-end" : "flex-start", animation: "pp-up .2s ease" };
  if (m.kind === "audio")
    return (
      <div style={row}>
        <div style={{ padding: "10px 14px", borderRadius: "18px 18px 6px 18px", background: "var(--brand)", color: "var(--brand-on)", display: "flex", flexDirection: "column", gap: 6, minWidth: 200, maxWidth: "86%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <I name="play_arrow" />
            <span aria-hidden style={{ display: "flex", gap: 2, alignItems: "center", height: 22, flex: 1 }}>
              {WAVE.map((w, k) => (
                <span key={k} style={{ width: 3, height: w, borderRadius: 2, background: "currentColor", opacity: 0.8 }} />
              ))}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{(m.card as Card)?.dur || "0:03"}</span>
          </div>
          {m.text && <div style={{ fontSize: 13, opacity: 0.9, fontStyle: "italic" }}>“{m.text}”</div>}
        </div>
      </div>
    );
  if (m.kind === "photo")
    return (
      <div style={row}>
        <div style={{ width: 180, height: 200, borderRadius: "18px 18px 6px 18px", background: "repeating-linear-gradient(135deg,var(--surface2) 0 8px,var(--line) 8px 9px)", display: "flex", alignItems: "flex-end", padding: 10, fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--ink2)" }}>foto da nota fiscal</div>
      </div>
    );
  const c = (m.card || {}) as Card;
  const box: CSSProperties = { width: "min(320px,100%)", padding: 14, borderRadius: "18px 18px 18px 6px", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 10 };
  const sec: CSSProperties = { minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700 };
  return (
    <div style={row}>
      <div style={{ maxWidth: "86%", display: "flex", flexDirection: "column" }}>
        <div style={box}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{c.kicker}</div>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>{c.title}</div>
          {c.type === "expense" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 900 }}>{brl(Number(c.v), true)}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: catSoft(category(c.cat).hue), fontSize: 13, fontWeight: 800 }}>
                  <I name={category(c.cat).icon} size={16} style={{ color: catColor(category(c.cat).hue) }} />
                  {category(c.cat).name}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink3)" }}>{c.meta} · categoria sugerida</div>
              {picking && c.status !== "done" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PICKABLE.filter((k) => k !== c.cat).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setPicking(false);
                        action(m.id, "category", { cat: k });
                      }}
                      style={{ minHeight: 36, padding: "0 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface2)", fontSize: 13, fontWeight: 700 }}
                    >
                      {category(k).name}
                    </button>
                  ))}
                </div>
              )}
              {c.status !== "done" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => action(m.id, "confirm")} style={btnPrimary(44, { borderRadius: 12, fontSize: 14, padding: 0 })}>
                    Confirmar
                  </button>
                  <button onClick={() => setPicking(!picking)} style={sec}>
                    Mudar categoria
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--good-t)", fontWeight: 800, fontSize: 14 }}>
                  <I name="check_circle" size={18} />
                  Registrado em {category(c.cat).name}
                </div>
              )}
            </>
          )}
          {c.type === "teto" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <b>{brl(Number(c.spent))}</b>
                <span style={{ color: "var(--ink3)" }}>de {brl(Number(c.limit))}</span>
              </div>
              <div role="img" aria-label={`Teto ${Math.round((c.spent / c.limit) * 100)}% usado`} style={{ position: "relative", height: 10, borderRadius: 5, background: "var(--surface2)" }}>
                <div style={{ width: `${Math.min(100, (c.spent / c.limit) * 100)}%`, height: "100%", borderRadius: 5, background: c.spent / c.limit >= 0.9 ? "var(--warn)" : "var(--good)" }} />
                <div style={{ position: "absolute", left: `${c.pace * 100}%`, top: -3, bottom: -3, width: 3, background: "var(--ink)", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.45 }}>{c.text}</div>
              <button onClick={() => go("gastos", "tetos")} style={{ ...sec, fontWeight: 800 }}>
                Ver teto
              </button>
            </>
          )}
          {c.type === "afford" && (
            <>
              <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                {(c.rows as { k: string; v: string; tone: string }[]).map((r) => (
                  <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: 10, borderRadius: 12, background: r.tone === "warn" ? "var(--warn-soft)" : "var(--surface2)" }}>
                    <span>{r.k}</span>
                    <b style={{ color: r.tone === "warn" ? "var(--warn-t)" : undefined }}>{r.v}</b>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.45 }}>{c.text}</div>
              <div style={{ display: "grid", gridTemplateColumns: c.safe > 0 ? "1fr 1fr" : "1fr", gap: 8 }}>
                {c.safe > 0 && (
                  <button onClick={() => action(m.id, "plan")} style={btnPrimary(44, { borderRadius: 12, fontSize: 13, padding: 0 })}>
                    Planejar {brl(c.safe)}
                  </button>
                )}
                <button onClick={() => go("plano", "prioridades")} style={{ ...sec, fontSize: 13 }}>
                  Ver o mês
                </button>
              </div>
            </>
          )}
          {c.type === "venc" &&
            (c.list as { d: string; n: string; v: number }[]).map((v, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, minHeight: 36, alignItems: "center", borderBottom: "1px solid var(--line)" }}>
                <span>
                  <b>{v.d}</b> · {v.n}
                </span>
                <b>{brl(v.v)}</b>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function WhatsApp({ split, onBack }: { split: boolean; onBack: () => void }) {
  const { bp, plan, toast } = useApp();
  const isM = bp === "mobile";
  const qc = useQueryClient();
  const snap = useSnapshot();
  const wa = snap.data?.whatsapp;
  const status = wa?.status || "off";
  const [phone, setPhone] = useState(wa?.phone || "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const alerts = wa?.alerts || { teto: true, venc: true, sem: true, ext: false };
  const refresh = () => qc.invalidateQueries({ queryKey: ["snapshot"] });
  const call = async (fn: () => Promise<unknown>) => {
    setErr("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const box: CSSProperties = split ? { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" } : { background: "var(--surface)", border: isM ? 0 : "1px solid var(--line)", borderRadius: isM ? 0 : 24, padding: isM ? "calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))" : 20, display: "flex", flexDirection: "column", gap: 16, minHeight: isM ? "100dvh" : "auto" };
  const AL: [keyof typeof alerts, string, string][] = [
    ["teto", "Tetos", "Quando uma categoria passa de 80% e de 100%"],
    ["venc", "Vencimentos", "3 dias antes e no dia"],
    ["sem", "Resumo semanal", "Toda segunda, às 8h"],
    ["ext", "Lembrete de extrato", "Dia 5, para enviar o extrato do mês"],
  ];
  return (
    <section aria-label="WhatsApp" style={box}>
      {!split && (
        <button onClick={onBack} style={{ alignSelf: "flex-start", minHeight: 44, border: 0, background: "none", display: "flex", alignItems: "center", gap: 6, fontWeight: 800, padding: 0 }}>
          <I name="arrow_back" />
          Voltar ao chat
        </button>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: "var(--brand-soft)", color: "var(--brand-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name="chat" />
        </span>
        <div>
          <h2 style={{ margin: 0, ...nunito(22) }}>Assistente no WhatsApp</h2>
          <div style={{ fontSize: 14, color: "var(--ink2)" }}>{status === "on" ? "Conectado · alertas ativos" : "Registre e consulte sem abrir o app"}</div>
        </div>
      </div>
      {!hasFeature(plan, "whatsapp") ? (
        <Paywall need="plus" headline="Registre gastos por áudio direto no WhatsApp" detail="O mesmo assistente, com alertas de teto e vencimento chegando onde você já está." />
      ) : (
        <>
          {status !== "on" && status !== "code" && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 800 }}>
                Seu número
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ minHeight: 48, padding: "0 12px", borderRadius: 12, background: "var(--surface2)", display: "flex", alignItems: "center", fontWeight: 800 }}>+55</span>
                  <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98765-4321" style={{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", padding: "0 12px", fontWeight: 700 }} />
                </div>
              </label>
              <button
                onClick={() =>
                  call(async () => {
                    const r = await api<{ devCode?: string }>("POST", "/api/whatsapp/link", { phone });
                    if (r.devCode) toast(`Modo de testes: o código é ${r.devCode}`);
                  })
                }
                style={btnPrimary(50, { borderRadius: 14 })}
              >
                Enviar código pelo WhatsApp
              </button>
            </>
          )}
          {status === "code" && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 800 }}>
                Código de 6 dígitos enviado para +55 {wa?.phone}
                <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} style={{ minHeight: 52, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", padding: "0 12px", fontWeight: 900, fontSize: 22, letterSpacing: ".3em" }} />
              </label>
              <button onClick={() => call(() => api("POST", "/api/whatsapp/verify", { code }))} style={btnPrimary(50, { borderRadius: 14 })}>
                Conectar
              </button>
            </>
          )}
          {status === "on" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "var(--good-soft)", color: "var(--good-t)", fontWeight: 800 }}>
              <I name="check_circle" />
              Conectado a +55 {wa?.phone}
            </div>
          )}
          {err && <div style={{ color: "var(--risk-t)", fontSize: 14, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>O que dá para fazer por lá</div>
            {[
              ["mic", "Mandar áudio:", "“gastei 48 no almoço” vira lançamento."],
              ["photo_camera", "Mandar foto", "da nota fiscal ou da fatura."],
              ["speed", "Consultar tetos", "e o que falta no mês."],
              ["help", "Perguntar “posso gastar?”", "e ver o impacto no plano."],
            ].map(([i, t, d]) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45 }}>
                <I name={i} size={20} style={{ color: "var(--brand-t)" }} />
                <span>
                  <b>{t}</b> {d}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Alertas que chegam no WhatsApp</div>
            {AL.map(([k, t, d]) => (
              <label key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 56, borderBottom: "1px solid var(--line)" }}>
                <span>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{t}</span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{d}</span>
                </span>
                <input type="checkbox" checked={!!alerts[k]} onChange={() => call(() => api("PATCH", "/api/whatsapp", { alerts: { ...alerts, [k]: !alerts[k] } }))} style={check} />
              </label>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>O assistente responde só sobre as suas finanças no PayPilot. Desligar o WhatsApp não remove nenhuma função do app.</div>
          {status === "on" && (
            <button onClick={() => call(() => api("DELETE", "/api/whatsapp"))} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700 }}>
              Desconectar WhatsApp
            </button>
          )}
        </>
      )}
    </section>
  );
}
