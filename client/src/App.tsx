import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, useMe } from "@/lib/api";
import { AppProvider, applyTheme, useApp, type ThemePref } from "@/lib/app";
import { Spinner } from "@/ui";
import Shell from "@/app/Shell";
import Onboarding from "@/screens/Onboarding";
import Inicio from "@/screens/Inicio";
import Gastos from "@/screens/Gastos";
import Plano from "@/screens/Plano";
import Metas from "@/screens/Metas";
import Contas from "@/screens/Contas";
import Assistente from "@/screens/Assistente";
import Perfil from "@/screens/Perfil";

const SCREENS: Record<string, () => JSX.Element | null> = { inicio: Inicio, gastos: Gastos, plano: Plano, metas: Metas, contas: Contas, assistente: () => <Assistente mode="full" />, perfil: Perfil };

function Routes() {
  const { route, user, go } = useApp();
  const [loc] = useLocation();
  // Rota inicial: logado → última rota (ou Início); sem sessão → boas-vindas.
  useEffect(() => {
    if (loc === "/" || !route) {
      if (!user) return go("onb", "boasvindas");
      let last = "/inicio";
      try {
        last = localStorage.getItem("pp-route") || last;
      } catch {
        /* sem armazenamento */
      }
      const [, r, s] = last.split("/");
      go(r || "inicio", s);
    } else if (!user && route !== "onb") go("onb", "boasvindas");
  }, [loc, route, user, go]);
  if (route === "onb" || !user) return <Onboarding />;
  const Screen = SCREENS[route] || Inicio;
  return (
    <Shell>
      <Screen />
    </Shell>
  );
}

function Root() {
  const me = useMe();
  useEffect(() => {
    if (me.data?.prefs?.theme) applyTheme(me.data.prefs.theme as ThemePref);
  }, [me.data?.prefs?.theme]);
  if (me.isLoading)
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={32} />
      </div>
    );
  return (
    <AppProvider user={me.data ?? null}>
      <Routes />
    </AppProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  );
}
