// Onboarding (Onboarding.dc.html): boas-vindas → cadastro → como conectar → Open Finance
// (banco, consentimento, redirecionando, sucesso) ou upload (enviar, lendo, resumo) → Raio-X.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BANKS } from "@shared/banks";
import { leakTotals, monthlyIncome, raioX } from "@shared/engine";
import { brl, dateBR, fromIso, monthShort, pct } from "@shared/format";
import type { PublicUser } from "@shared/schema";
import { api, ApiError, filesToUpload, useSnapshot } from "@/lib/api";
import { useApp } from "@/lib/app";
import { I, LOGO_BG, Logo, nunito, Segmented, Spinner } from "@/ui";

const ORDER = ["boasvindas", "cadastro", "entrar", "conectar", "banco", "consentimento", "redirecionando", "sucesso", "upload", "lendo", "resumo", "raiox"] as const;
type Step = (typeof ORDER)[number];
const PUBLIC: Step[] = ["boasvindas", "cadastro", "entrar"];
const PROG: Partial<Record<Step, number>> = { cadastro: 20, entrar: 20, conectar: 35, banco: 50, consentimento: 62, redirecionando: 74, sucesso: 86, upload: 55, lendo: 70, resumo: 86, raiox: 100 };

interface ImportResult {
  fileName: string;
  format: string;
  status: string;
  txCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  accountKind: string | null;
  institution: string | null;
  message: string | null;
}

// Estado do fluxo que precisa sobreviver à troca de passo (rotas diferentes).
const flow: { bank: string; path: "of" | "up"; files: File[]; sample: boolean; results: ImportResult[]; found: { n: string; v: string }[] } = { bank: "itau", path: "of", files: [], sample: false, results: [], found: [] };

export default function Onboarding() {
  const { sub, go, w, user } = useApp();
  const wanted = (ORDER.includes(sub as Step) ? sub : "boasvindas") as Step;
  const step: Step = !user && !PUBLIC.includes(wanted) ? "boasvindas" : user && PUBLIC.includes(wanted) ? "conectar" : wanted;
  useEffect(() => {
    if (step !== wanted) go("onb", step);
  }, [step, wanted, go]);
  const bp = w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  const wide = bp === "desktop";
  const isM = bp === "mobile";
  const idx = ORDER.indexOf(step);
  const prevOf: Partial<Record<Step, Step>> = { cadastro: "boasvindas", entrar: "boasvindas", conectar: user ? undefined : "cadastro", banco: "conectar", consentimento: "banco", redirecionando: "consentimento", sucesso: "banco", upload: "conectar", lendo: "upload", resumo: "upload", raiox: flow.path === "up" ? "resumo" : "sucesso" };
  const back = prevOf[step];
  const to = (s: Step) => go("onb", s);
  const skip = () => go("inicio");
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: wide ? "minmax(360px,42%) minmax(0,1fr)" : "minmax(0,1fr)", background: "var(--bg)" }}>
      {wide && (
        <aside style={{ position: "sticky", top: 0, height: "100vh", background: "#0B6B3A", color: "#fff", padding: 40, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={44} border="2px solid rgba(255,255,255,.2)" />
            <span style={{ ...nunito(24), color: "#FCE7C3" }}>PayPilot</span>
          </div>
          <img src="/logo.png" alt="Mascote PayPilot, um esquilo segurando um cartão com gráfico" style={{ width: "min(380px,90%)", alignSelf: "center", borderRadius: 32 }} />
          <div style={{ ...nunito(26, 800), lineHeight: 1.25, color: "#FCE7C3", textWrap: "pretty" } as CSSProperties}>Sair do vermelho é um plano, não um milagre.</div>
        </aside>
      )}
      <main style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: isM ? "calc(12px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))" : "32px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48 }}>
          {back && idx > 0 && (
            <button onClick={() => to(back)} aria-label="Voltar" style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--surface)", flex: "none" }}>
              <I name="arrow_back" />
            </button>
          )}
          {idx > 0 && (
            <div role="progressbar" aria-valuenow={PROG[step] || 0} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do cadastro" style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface2)" }}>
              <div style={{ width: `${PROG[step] || 0}%`, height: "100%", borderRadius: 3, background: "var(--brand)", transition: "width .3s" }} />
            </div>
          )}
          {user && ["conectar", "banco", "upload"].includes(step) && (
            <button onClick={skip} style={{ marginLeft: "auto", minHeight: 44, border: 0, background: "none", color: "var(--ink2)", fontWeight: 700 }}>
              Pular
            </button>
          )}
        </div>
        <div key={step} style={{ flex: 1, width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, paddingTop: 12, animation: "pp-up .25s ease" }}>
          {step === "boasvindas" && <BoasVindas wide={wide} to={to} />}
          {step === "cadastro" && <Cadastro to={to} />}
          {step === "entrar" && <Entrar />}
          {step === "conectar" && <Conectar to={to} />}
          {step === "banco" && <Banco to={to} />}
          {step === "consentimento" && <Consentimento to={to} />}
          {step === "redirecionando" && <Redirecionando to={to} />}
          {step === "sucesso" && <Sucesso to={to} />}
          {step === "upload" && <Upload to={to} isM={isM} />}
          {step === "lendo" && <Lendo to={to} />}
          {step === "resumo" && <Resumo to={to} />}
          {step === "raiox" && <RaioX />}
        </div>
      </main>
    </div>
  );
}

const H1 = (size = 28): CSSProperties => ({ margin: 0, ...nunito(size), lineHeight: 1.2 });
const primary: CSSProperties = { minHeight: 54, borderRadius: 16, border: 0, background: "var(--brand)", color: "var(--brand-on)", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
const secondary: CSSProperties = { minHeight: 50, borderRadius: 16, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 700, fontSize: 16 };
const foot: CSSProperties = { marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: "env(safe-area-inset-bottom)" };
const small: CSSProperties = { fontSize: 12, color: "var(--ink3)", textAlign: "center" };
const field: CSSProperties = { minHeight: 52, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", padding: "0 14px", fontSize: 16 };

function BoasVindas({ wide, to }: { wide: boolean; to: (s: Step) => void }) {
  const B = [
    { i: "hub", t: "Tudo em um lugar", d: "Contas, cartões e até dívidas com a família." },
    { i: "low_priority", t: "O que pagar primeiro", d: "Com o custo de cada escolha à vista." },
    { i: "trending_up", t: "Um plano mês a mês", d: "Até sobrar dinheiro no fim do mês." },
  ];
  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
        {!wide && <img src="/logo.png" alt="PayPilot" style={{ width: 132, height: 132, borderRadius: 32, boxShadow: "var(--shadow)" }} />}
        <h1 style={{ margin: 0, ...nunito(34), lineHeight: 1.12, letterSpacing: "-.01em", textWrap: "pretty" } as CSSProperties}>Seu copiloto para fechar o mês e sair das dívidas.</h1>
        <p style={{ margin: 0, fontSize: 17, color: "var(--ink2)", lineHeight: 1.5, textWrap: "pretty" } as CSSProperties}>O PayPilot junta suas contas e cartões, mostra para onde o dinheiro vai e monta com você um plano até sobrar.</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {B.map((b) => (
            <li key={b.t} style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand-soft)", color: "var(--brand-t)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <I name={b.i} />
              </span>
              <span>
                <span style={{ display: "block", fontWeight: 800 }}>{b.t}</span>
                <span style={{ display: "block", fontSize: 14, color: "var(--ink2)" }}>{b.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button onClick={() => to("cadastro")} style={primary}>
          Começar
        </button>
        <button onClick={() => to("entrar")} style={secondary}>
          Já tenho conta
        </button>
        <div style={small}>Não somos banco e não vendemos crédito. Só assinatura.</div>
      </div>
    </>
  );
}

function useIdent() {
  const [mode, setMode] = useState<"email" | "cel">("email");
  const [ident, setIdent] = useState("");
  const tabs = (
    <Segmented
      value={mode}
      onChange={(m) => {
        setMode(m);
        setIdent("");
      }}
      options={[
        { id: "email", label: "E-mail" },
        { id: "cel", label: "Celular" },
      ]}
    />
  );
  const inputEl = (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 800 }}>
      {mode === "email" ? "E-mail" : "Celular"}
      <input type={mode === "email" ? "email" : "tel"} inputMode={mode === "email" ? "email" : "tel"} value={ident} onChange={(e) => setIdent(e.target.value)} placeholder={mode === "email" ? "voce@email.com" : "(11) 98765-4321"} autoComplete="username" style={field} />
    </label>
  );
  return { ident, tabs, inputEl };
}

function PasswordField({ pw, setPw, hint, auto }: { pw: string; setPw: (v: string) => void; hint?: boolean; auto: string }) {
  const [show, setShow] = useState(false);
  const strong = pw.length >= 8;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 800 }}>
      Senha
      <div style={{ display: "flex", alignItems: "center", borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" }}>
        <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={hint ? "Mínimo de 8 caracteres" : "Sua senha"} autoComplete={auto} style={{ flex: 1, minWidth: 0, minHeight: 52, border: 0, background: "none", padding: "0 14px", fontSize: 16, outline: "none" }} />
        <button type="button" onClick={() => setShow(!show)} aria-label="Mostrar ou esconder senha" style={{ width: 48, height: 48, border: 0, background: "none", color: "var(--ink3)" }}>
          <I name={show ? "visibility_off" : "visibility"} />
        </button>
      </div>
      {hint && <span style={{ fontSize: 13, color: !pw ? "var(--ink3)" : strong ? "var(--good-t)" : "var(--warn-t)", fontWeight: 600 }}>{!pw ? "Use letras e números." : strong ? "Senha boa." : `Faltam ${8 - pw.length} caracteres.`}</span>}
    </label>
  );
}

function useLoginDone() {
  const qc = useQueryClient();
  return async (u: PublicUser, next: () => void) => {
    qc.setQueryData(["me"], u);
    await qc.invalidateQueries({ queryKey: ["snapshot"] });
    next();
  };
}

function Cadastro({ to }: { to: (s: Step) => void }) {
  const { ident, tabs, inputEl } = useIdent();
  const [pw, setPw] = useState("");
  const [bio, setBio] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const done = useLoginDone();
  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const u = await api<PublicUser>("POST", "/api/auth/signup", { ident, password: pw, biometric: bio });
      await done(u, () => to("conectar"));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h1 style={H1()}>Crie sua conta</h1>
      {tabs}
      {inputEl}
      <PasswordField pw={pw} setPw={setPw} hint auto="new-password" />
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)", minHeight: 56 }}>
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <I name="fingerprint" style={{ color: "var(--brand-t)" }} />
          <span>
            <span style={{ display: "block", fontWeight: 800 }}>Entrar com biometria</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--ink2)" }}>Face ID ou digital no celular</span>
          </span>
        </span>
        <input type="checkbox" checked={bio} onChange={() => setBio(!bio)} style={{ width: 24, height: 24, accentColor: "var(--brand)" }} />
      </label>
      <div style={{ display: "flex", gap: 12, padding: 16, borderRadius: 16, background: "var(--brand-soft)" }}>
        <I name="lock" style={{ color: "var(--brand-t)" }} />
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          <b>Seus dados ficam trancados.</b> Tudo é criptografado, nunca vendemos nada a ninguém e não guardamos senha de banco. Você pode apagar tudo quando quiser.
        </div>
      </div>
      {err && <div style={{ color: "var(--risk-t)", fontWeight: 700, fontSize: 14 }}>{err}</div>}
      <div style={foot}>
        <button onClick={() => void submit()} disabled={busy || !ident || pw.length < 8} style={{ ...primary, opacity: !ident || pw.length < 8 ? 0.5 : 1 }}>
          {busy ? <Spinner color="var(--brand-on)" /> : "Criar conta"}
        </button>
        <div style={small}>Ao continuar, você aceita os Termos de uso e a Política de privacidade.</div>
      </div>
    </>
  );
}

function Entrar() {
  const { go } = useApp();
  const { ident, tabs, inputEl } = useIdent();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const done = useLoginDone();
  const last = () => {
    try {
      const r = localStorage.getItem("pp-route");
      if (r) {
        const [, a, b] = r.split("/");
        return go(a, b);
      }
    } catch {
      /* sem armazenamento */
    }
    go("inicio");
  };
  const run = async (fn: () => Promise<PublicUser>) => {
    setErr("");
    setBusy(true);
    try {
      await done(await fn(), last);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h1 style={H1()}>Entrar no PayPilot</h1>
      {tabs}
      {inputEl}
      <PasswordField pw={pw} setPw={setPw} auto="current-password" />
      {err && <div style={{ color: "var(--risk-t)", fontWeight: 700, fontSize: 14 }}>{err}</div>}
      <div style={{ display: "flex", gap: 12, padding: 16, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)" }}>
        <img src="/logo.png" alt="" style={{ width: 44, height: 44, borderRadius: 12 }} />
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>
          <b>Quer ver como funciona?</b> A conta de demonstração tem os dados do Marcos, nossa persona: renda de R$ 34 mil e compromissos de R$ 46,5 mil.
          <button onClick={() => void run(() => api<PublicUser>("POST", "/api/auth/demo"))} disabled={busy} style={{ display: "block", marginTop: 6, minHeight: 36, border: 0, background: "none", color: "var(--brand-t)", fontWeight: 800, padding: 0 }}>
            Entrar com a conta de demonstração
          </button>
        </div>
      </div>
      <div style={foot}>
        <button onClick={() => void run(() => api<PublicUser>("POST", "/api/auth/login", { ident, password: pw }))} disabled={busy || !ident || !pw} style={{ ...primary, opacity: !ident || !pw ? 0.5 : 1 }}>
          {busy ? <Spinner color="var(--brand-on)" /> : "Entrar"}
        </button>
      </div>
    </>
  );
}

function Conectar({ to }: { to: (s: Step) => void }) {
  const O = [
    { i: "account_balance", t: "Conectar via Open Finance", d: "Automático e seguro, autorizado pelo Banco Central.", pros: ["Atualiza sozinho todo dia", "Pega faturas, limites e datas", "Revogue quando quiser"], cons: ["No plano Grátis, 1 conta"], cta: "Conectar banco", on: () => ((flow.path = "of"), to("banco")), hl: true },
    { i: "upload_file", t: "Enviar extratos e faturas", d: "OFX, CSV ou PDF, para quem prefere não conectar.", pros: ["Nada fica conectado ao banco", "Ilimitado no plano Grátis", "Funciona com qualquer banco"], cons: ["Você envia todo mês (a gente lembra)"], cta: "Enviar arquivos", on: () => ((flow.path = "up"), to("upload")), hl: false },
  ];
  return (
    <>
      <h1 style={H1()}>Como você quer trazer seus dados?</h1>
      <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5 }}>Dá para trocar depois. Muita gente começa enviando arquivos e conecta mais tarde.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {O.map((o) => (
          <article key={o.t} style={{ padding: 18, borderRadius: 20, background: "var(--surface)", border: `2px solid ${o.hl ? "var(--brand-t)" : "var(--line)"}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: o.hl ? "var(--brand-soft)" : "var(--accent-soft)", color: o.hl ? "var(--brand-t)" : "var(--accent-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I name={o.i} />
            </span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{o.t}</div>
              <div style={{ fontSize: 14, color: "var(--ink2)", marginTop: 2 }}>{o.d}</div>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              {o.pros.map((p) => (
                <li key={p} style={{ display: "flex", gap: 6 }}>
                  <I name="check" size={18} style={{ color: "var(--good-t)" }} />
                  {p}
                </li>
              ))}
              {o.cons.map((p) => (
                <li key={p} style={{ display: "flex", gap: 6, color: "var(--ink2)" }}>
                  <I name="remove" size={18} style={{ color: "var(--ink3)" }} />
                  {p}
                </li>
              ))}
            </ul>
            <button onClick={o.on} style={{ marginTop: "auto", minHeight: 50, borderRadius: 14, border: o.hl ? 0 : "1px solid var(--line)", background: o.hl ? "var(--brand)" : "var(--surface)", color: o.hl ? "var(--brand-on)" : "var(--ink)", fontWeight: 800 }}>
              {o.cta}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function Banco({ to }: { to: (s: Step) => void }) {
  const [q, setQ] = useState("");
  const [bank, setBank] = useState(flow.bank);
  const b = BANKS.find((x) => x.id === bank);
  return (
    <>
      <h1 style={H1()}>Escolha seu banco</h1>
      <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 52, padding: "0 14px", borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" }}>
        <I name="search" style={{ color: "var(--ink3)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar banco ou cartão" aria-label="Buscar banco" style={{ flex: 1, minWidth: 0, border: 0, background: "none", outline: "none", fontSize: 16 }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 10 }}>
        {BANKS.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).map((x) => (
          <button key={x.id} onClick={() => setBank(x.id)} aria-pressed={bank === x.id} style={{ minHeight: 104, borderRadius: 18, border: `2px solid ${bank === x.id ? "var(--brand-t)" : "var(--line)"}`, background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 10 }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: x.c, color: x.tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14 }}>
              {x.m}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>{x.name}</span>
          </button>
        ))}
      </div>
      <div style={foot}>
        <div style={{ fontSize: 13, color: "var(--ink3)", display: "flex", gap: 6, alignItems: "center" }}>
          <I name="verified_user" size={18} />
          Conexão feita por instituição autorizada pelo Banco Central.
        </div>
        <button
          disabled={!b}
          onClick={() => {
            flow.bank = bank;
            to("consentimento");
          }}
          style={{ ...primary, opacity: b ? 1 : 0.5 }}
        >
          Continuar com {b?.name}
        </button>
      </div>
    </>
  );
}

const bankSel = () => BANKS.find((x) => x.id === flow.bank) || BANKS[1];

function Consentimento({ to }: { to: (s: Step) => void }) {
  const b = bankSel();
  const { today } = { today: new Date() };
  const until = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const D = [
    { i: "badge", t: "Dados cadastrais", d: "Nome e CPF, para confirmar que é você." },
    { i: "account_balance_wallet", t: "Saldos e extratos", d: "Para mostrar para onde o dinheiro vai." },
    { i: "credit_card", t: "Faturas de cartão", d: "Para achar assinaturas, tarifas e datas." },
    { i: "request_quote", t: "Limites e operações de crédito", d: "Para calcular o custo de cada dívida." },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden style={{ width: 52, height: 52, borderRadius: 14, background: b.c, color: b.tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
          {b.m}
        </span>
        <I name="sync_alt" style={{ color: "var(--ink3)" }} />
        <span style={{ width: 52, height: 52, borderRadius: 14, background: LOGO_BG() }} />
      </div>
      <h1 style={H1(26)}>O {b.name} vai compartilhar com o PayPilot</h1>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "6px 16px" }}>
        {D.map((c) => (
          <div key={c.t} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
            <I name={c.i} style={{ color: "var(--brand-t)" }} />
            <span>
              <span style={{ display: "block", fontWeight: 800 }}>{c.t}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--ink2)" }}>{c.d}</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--surface2)" }}>
          <div style={{ fontWeight: 800, display: "flex", gap: 6, alignItems: "center" }}>
            <I name="schedule" size={20} />
            Por 12 meses
          </div>
          <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4 }}>Até {dateBR(until)}. Você pode revogar a qualquer momento.</div>
        </div>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--surface2)" }}>
          <div style={{ fontWeight: 800, display: "flex", gap: 6, alignItems: "center" }}>
            <I name="block" size={20} />O que não fazemos
          </div>
          <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4 }}>Não fazemos pagamentos, não movemos dinheiro e não vemos sua senha.</div>
        </div>
      </div>
      <div style={foot}>
        <button onClick={() => to("redirecionando")} style={primary}>
          Continuar no app do {b.name}
          <I name="open_in_new" />
        </button>
        <div style={small}>Você vai confirmar a autorização no ambiente seguro do seu banco.</div>
      </div>
    </>
  );
}

function Redirecionando({ to }: { to: (s: Step) => void }) {
  const b = bankSel();
  const { go } = useApp();
  const qc = useQueryClient();
  const [err, setErr] = useState<ApiError | null>(null);
  const started = useRef(false);
  const run = () => {
    setErr(null);
    const t0 = Date.now();
    api<{ found: { n: string; v: string }[] }>("POST", "/api/openfinance/connect", { institution: b.name })
      .then(async (r) => {
        flow.found = r.found;
        await qc.invalidateQueries({ queryKey: ["snapshot"] });
        setTimeout(() => to("sucesso"), Math.max(0, 2400 - (Date.now() - t0)));
      })
      .catch((e: ApiError) => setErr(e));
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  });
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 60, height: 60, borderRadius: 16, background: LOGO_BG() }} />
        {err ? <I name="error" size={28} style={{ color: "var(--warn-t)" }} /> : <Spinner size={28} />}
        <span aria-hidden style={{ width: 60, height: 60, borderRadius: 16, background: b.c, color: b.tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
          {b.m}
        </span>
      </div>
      {err ? (
        <>
          <h1 style={H1(24)}>Não deu para conectar agora</h1>
          <p style={{ margin: 0, color: "var(--ink2)", maxWidth: 360, lineHeight: 1.5 }}>{err.message}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {err.status === 402 ? (
              <button onClick={() => go("perfil", "planos")} style={{ ...primary, minHeight: 48, padding: "0 20px", fontSize: 15 }}>
                Ver planos
              </button>
            ) : (
              <button onClick={run} style={{ ...primary, minHeight: 48, padding: "0 20px", fontSize: 15 }}>
                Tentar de novo
              </button>
            )}
            <button onClick={() => to("upload")} style={{ ...secondary, minHeight: 48, padding: "0 20px", fontSize: 15 }}>
              Enviar arquivos
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 style={H1(24)}>Levando você ao {b.name} com segurança…</h1>
          <p style={{ margin: 0, color: "var(--ink2)", maxWidth: 360, lineHeight: 1.5 }}>Confirme o compartilhamento por lá. Depois voltamos sozinhos para cá.</p>
          <div style={{ fontSize: 12, color: "var(--ink3)", maxWidth: 360 }}>Nesta versão, a conexão roda em ambiente de testes (sandbox) com dados de exemplo.</div>
        </>
      )}
    </div>
  );
}

function Sucesso({ to }: { to: (s: Step) => void }) {
  const b = bankSel();
  const found = flow.found;
  const cards = found.filter((f) => f.n.startsWith("Cartão")).length;
  const contas = found.length - cards;
  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
        <span style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--good-soft)", color: "var(--good-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name="task_alt" size={46} />
        </span>
        <h1 style={H1()}>{b.name} conectado!</h1>
        <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5 }}>
          Encontramos {contas} {contas === 1 ? "conta" : "contas"} e {cards} {cards === 1 ? "cartão" : "cartões"}, com 3 meses de histórico. Atualizamos sozinhos todo dia.
        </p>
        <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "4px 16px", textAlign: "left" }}>
          {found.map((f) => (
            <div key={f.n} style={{ display: "flex", justifyContent: "space-between", minHeight: 48, alignItems: "center", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
              <span>{f.n}</span>
              <b>{f.v}</b>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button onClick={() => to("raiox")} style={primary}>
          Ver meu Raio-X
        </button>
        <button onClick={() => to("banco")} style={secondary}>
          Conectar outro banco
        </button>
      </div>
    </>
  );
}

function Upload({ to, isM }: { to: (s: Step) => void; isM: boolean }) {
  const [files, setFiles] = useState<File[]>(flow.files);
  const [sample, setSample] = useState(flow.sample);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => {
    const f = Array.from(list || []);
    if (f.length) {
      setSample(false);
      setFiles((cur) => [...cur, ...f]);
    }
  };
  const SAMPLE = ["extrato_itau.ofx", "fatura_nubank.csv", "fatura_xp.csv", "extrato_santander.csv"];
  const names = sample ? SAMPLE : files.map((f) => f.name);
  const n = names.length;
  return (
    <>
      <h1 style={H1()}>Envie extratos e faturas</h1>
      <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.5 }}>OFX, CSV ou PDF. Quanto mais meses, melhor o Raio-X — 3 meses já bastam.</p>
      <input ref={fileRef} type="file" multiple accept=".ofx,.csv,.txt,.pdf,image/*" onChange={(e) => add(e.target.files)} style={{ display: "none" }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={(e) => add(e.target.files)} style={{ display: "none" }} />
      {!isM ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            add(e.dataTransfer.files);
          }}
          style={{ minHeight: 220, borderRadius: 22, border: `2px dashed ${over ? "var(--brand-t)" : "var(--line)"}`, background: over ? "var(--brand-soft)" : "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 24, transition: "background .15s" }}
        >
          <I name="upload_file" size={40} style={{ color: "var(--brand-t)" }} />
          <div style={{ fontWeight: 800, fontSize: 17 }}>Arraste seus arquivos aqui</div>
          <div style={{ fontSize: 14, color: "var(--ink2)" }}>ou</div>
          <button onClick={() => fileRef.current?.click()} style={{ minHeight: 46, padding: "0 18px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 800 }}>
            Escolher arquivos
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["folder_open", "Escolher arquivos", fileRef],
            ["photo_camera", "Fotografar fatura", camRef],
          ].map(([i, t, r]) => (
            <button key={t as string} onClick={() => (r as typeof fileRef).current?.click()} style={{ minHeight: 120, borderRadius: 20, border: "2px dashed var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 800 }}>
              <I name={i as string} size={32} style={{ color: "var(--brand-t)" }} />
              {t as string}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => {
          setFiles([]);
          setSample(true);
        }}
        style={{ alignSelf: "flex-start", minHeight: 44, border: 0, background: "none", color: "var(--brand-t)", fontWeight: 800, padding: 0 }}
      >
        Usar arquivos de exemplo
      </button>
      {n > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "4px 14px" }}>
          {names.map((f, k) => (
            <div key={f + k} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderBottom: "1px solid var(--line)" }}>
              <I name="description" style={{ color: "var(--ink3)" }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f}</span>
              <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 800 }}>{(f.split(".").pop() || "").toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
      <div style={foot}>
        <button
          disabled={!n}
          onClick={() => {
            flow.files = files;
            flow.sample = sample;
            flow.path = "up";
            to("lendo");
          }}
          style={{ ...primary, opacity: n ? 1 : 0.5 }}
        >
          Ler {n || ""} arquivos
        </button>
        <div style={small}>Os arquivos são lidos e guardados com segurança. Nada é compartilhado.</div>
      </div>
    </>
  );
}

function Lendo({ to }: { to: (s: Step) => void }) {
  const qc = useQueryClient();
  const [p, setP] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const started = useRef(false);
  const names = flow.sample ? ["extrato_itau.ofx", "fatura_nubank.csv", "fatura_xp.csv", "extrato_santander.csv"] : flow.files.map((f) => f.name);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ti = window.setInterval(() => setP((v) => Math.min(done ? 100 : 92, v + 3)), 90);
    (async () => {
      try {
        const r = flow.sample ? await api<{ results: ImportResult[] }>("POST", "/api/imports/sample") : await api<{ results: ImportResult[] }>("POST", "/api/imports", { files: await filesToUpload(flow.files) });
        flow.results = r.results;
        await qc.invalidateQueries({ queryKey: ["snapshot"] });
        setDone(true);
        setP(100);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        window.clearInterval(ti);
      }
    })();
    return () => window.clearInterval(ti);
  });
  const total = flow.results.reduce((a, r) => a + r.txCount, 0);
  return (
    <>
      <h1 style={H1()}>{done ? "Leitura concluída" : err ? "Não conseguimos ler" : "Lendo seus arquivos…"}</h1>
      <div aria-live="polite" style={{ fontSize: 15, color: err ? "var(--risk-t)" : "var(--ink2)" }}>
        {err || (done ? `${total} transações encontradas` : "Organizando transações por conta e categoria…")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {names.map((n, k) => {
          const r = flow.results[k];
          const fp = done ? 100 : Math.max(0, Math.min(100, (p - k * (60 / names.length)) * 1.6));
          const pending = done && r && r.status !== "lido";
          return (
            <div key={n + k} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 800, color: pending ? "var(--warn-t)" : fp >= 100 ? "var(--good-t)" : "var(--ink3)" }}>
                  <I name={pending ? "schedule" : fp >= 100 ? "check_circle" : "hourglass_top"} size={16} />
                  {pending ? "Pendente" : fp >= 100 ? (r ? `${r.txCount} lidas` : "Pronto") : fp > 0 ? "Lendo" : "Na fila"}
                </span>
              </div>
              <div role="progressbar" aria-valuenow={Math.round(fp)} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 4, background: "var(--surface2)" }}>
                <div style={{ width: `${fp}%`, height: "100%", borderRadius: 4, background: pending ? "var(--warn)" : "var(--brand)", transition: "width .2s" }} />
              </div>
              {pending && r?.message && <div style={{ fontSize: 13, color: "var(--ink2)" }}>{r.message}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button onClick={() => (err ? to("upload") : to("resumo"))} disabled={!done && !err} style={{ ...primary, width: "100%", opacity: done || err ? 1 : 0.5 }}>
          {err ? "Voltar e tentar de novo" : "Ver resumo"}
        </button>
      </div>
    </>
  );
}

function Resumo({ to }: { to: (s: Step) => void }) {
  const rs = flow.results.filter((r) => r.status === "lido");
  const total = rs.reduce((a, r) => a + r.txCount, 0);
  const starts = rs.map((r) => r.periodStart).filter(Boolean).sort() as string[];
  const ends = rs.map((r) => r.periodEnd).filter(Boolean).sort() as string[];
  const s = starts[0] ? fromIso(starts[0]) : null;
  const e = ends[ends.length - 1] ? fromIso(ends[ends.length - 1]) : null;
  const months = s && e ? (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1 : 0;
  const S = [
    { k: "Período", v: s && e ? `${dateBR(s).slice(0, 5)} a ${dateBR(e).slice(0, 5)}` : "—" },
    { k: "Arquivos", v: `${rs.length} lidos` },
    { k: "Contas", v: `${rs.filter((r) => r.accountKind === "conta").length} contas` },
    { k: "Faturas", v: `${rs.filter((r) => r.accountKind === "cartao").length} cartões` },
  ];
  return (
    <>
      <span style={{ alignSelf: "flex-start", width: 64, height: 64, borderRadius: "50%", background: "var(--good-soft)", color: "var(--good-t)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <I name="task_alt" size={34} />
      </span>
      <h1 style={H1()}>
        {months} {months === 1 ? "mês" : "meses"} de extrato, {total} transações
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {S.map((x) => (
          <div key={x.k} style={{ padding: 14, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 13, color: "var(--ink3)" }}>{x.k}</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{x.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, padding: 14, borderRadius: 16, background: "var(--surface2)", fontSize: 14, lineHeight: 1.45 }}>
        <I name="notifications" style={{ color: "var(--ink3)" }} />
        <span>Vamos te lembrar no dia 5 de cada mês de enviar o extrato novo. Leva 1 minuto.</span>
      </div>
      <div style={{ marginTop: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button onClick={() => to("raiox")} style={{ ...primary, width: "100%" }}>
          Ver meu Raio-X
        </button>
      </div>
    </>
  );
}

function RaioX() {
  const { go } = useApp();
  const qc = useQueryClient();
  const snap = useSnapshot();
  const d = snap.data;
  const finish = async (r: string, s = "") => {
    await api("PATCH", "/api/me", { onboarded: true }).catch(() => null);
    await qc.invalidateQueries({ queryKey: ["me"] });
    go(r, s);
  };
  if (!d)
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={32} />
      </div>
    );
  const today = fromIso(d.today);
  const income = monthlyIncome(d.incomes);
  const rx = raioX(d.transactions, income, d.subscriptions, today);
  const lt = leakTotals(d.leaks);
  const music = d.leaks.find((l) => l.status === "aberto" && /música repetido/.test(l.reason));
  const period = rx.months.length ? `${monthShort(Number(rx.months[0].slice(5)) - 1)} a ${monthShort(Number(rx.months[rx.months.length - 1].slice(5)) - 1)}` : "últimos meses";
  return (
    <>
      <section style={{ borderRadius: 28, background: "#0A4F2C", color: "#fff", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={40} border="2px solid rgba(255,255,255,.2)" />
          <span style={{ fontWeight: 800, color: "#FCE7C3" }}>Seu Raio-X · {period}</span>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "#D7EBDD", fontWeight: 700 }}>{rx.avgHole > 0 ? "Buraco médio por mês" : "Sobra média por mês"}</div>
          <div style={{ ...nunito(52), lineHeight: 1 }}>{brl(Math.abs(rx.avgHole))}</div>
          <div style={{ fontSize: 15, color: "#E6F2EA", marginTop: 6, lineHeight: 1.45 }}>{rx.avgHole > 0 ? "É quanto, em média, os compromissos passaram da renda. É comum — e tem saída." : "Os compromissos couberam na renda. Vamos manter assim."}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.1)" }}>
            <div style={{ fontSize: 13, color: "#D7EBDD" }}>Juros e tarifas</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              {brl(rx.interestMonthly)}
              <span style={{ fontSize: 14 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: "#D7EBDD" }}>{pct(Math.round(rx.interestPct), 0)} da sua renda</div>
          </div>
          <div style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.1)" }}>
            <div style={{ fontSize: 13, color: "#D7EBDD" }}>Assinaturas</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              {rx.subsCount} · {brl(rx.subsTotal)}
            </div>
            <div style={{ fontSize: 12, color: "#D7EBDD" }}>{music ? "2 de música em cartões diferentes" : "por mês"}</div>
          </div>
        </div>
      </section>
      {lt.monthly > 0 && (
        <div style={{ display: "flex", gap: 12, padding: 16, borderRadius: 18, background: "var(--good-soft)" }}>
          <I name="savings" style={{ color: "var(--good-t)" }} />
          <div style={{ fontSize: 15, lineHeight: 1.45 }}>
            <b>Dá para começar já:</b> só em assinaturas, tarifas e seguros evitáveis, encontramos {brl(lt.monthly)} por mês.
          </div>
        </div>
      )}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button onClick={() => void finish("gastos", "vazamentos")} style={{ ...primary, minHeight: 56 }}>
          Ver o que dá para cortar agora
          <I name="arrow_forward" />
        </button>
        <button onClick={() => void finish("inicio")} style={secondary}>
          Ir para o início
        </button>
      </div>
    </>
  );
}
