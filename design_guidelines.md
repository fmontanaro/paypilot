# PayPilot · Design system

Guia para recriar o handoff de alta fidelidade em `design_handoff_paypilot/`. Cores, tipografia, espaçamentos, copy e interações de lá são finais; os valores em reais são exemplos. Os tokens estão implementados em `client/src/styles.css` e os componentes em `client/src/ui/`.

Para conferir uma tela, abra o `.dc.html` correspondente no navegador (`PayPilot.dc.html` é o app navegável; `Telas.dc.html` mostra todos os quadros em mobile, tablet, desktop e escuro).

## Tom

Calma, controle e progresso. A pessoa abre o app estressada e precisa sair sabendo o que fazer agora.

- **Sem julgamento.** Nada de vermelho gritante nem linguagem de culpa. Problema aparece como fato com saída: "Faltam R$ 8.400 para fechar outubro. Veja 3 formas de cobrir."
- **Confiável como um banco, humano como um amigo.**
- **Progresso sempre visível:** buraco diminuindo, dívida caindo, data de quitação chegando.
- **Números grandes e legíveis**, sempre com algarismos tabulares.
- **Português do Brasil.** Moeda `R$ 1.234,56`; datas `14 out` ou `14/10/2026`.
- O vermelho suave (`--risk`) fica só para risco real: negativação, vencimento hoje.

## Tokens de cor

Tema por `data-theme="claro" | "escuro"` no `<html>`. "Sistema" segue `prefers-color-scheme`.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | #F5F2EA | #0D1410 | fundo da página |
| `--surface` | #FFFFFF | #151F19 | cards, barras de navegação |
| `--surface2` | #EEEAE0 | #1D2922 | trilhos de barra, campos, chips |
| `--line` | #E2DDD1 | #2B3931 | bordas e divisórias |
| `--ink` / `--ink2` / `--ink3` | #16211B / #46534B / #626D66 | #ECF1ED / #B4C0B8 / #93A097 | texto principal, secundário e terciário |
| `--brand` | #0B6B3A | #46B97A | ação primária |
| `--brand-on` | #FFFFFF | #05200F | texto sobre `--brand` |
| `--brand-t` | #0B6B3A | #6FCF98 | texto na cor da marca |
| `--brand-soft` | #E1EFE5 | #163524 | fundo de item ativo, destaques |
| `--brand-deep` | #0A4F2C | #0B5A31 | cards de impacto (Raio-X, vazamentos, Pilot) |
| `--accent` / `-soft` / `-t` | #E9822A / #FCEBD6 / #9C4B0B | #F0954A / #3A2614 / #F6B47C | microfone, metas, parcelar |
| `--good` / `-soft` / `-t` | #1E8C4E / #DCF2E3 / #16703D | #4FC285 / #14341F / #7CD8A5 | progresso e economia |
| `--warn` / `-soft` / `-t` | #C98A0B / #FBEFD2 / #7F5300 | #E2A93B / #382B10 / #F0C467 | atenção |
| `--risk` / `-soft` / `-t` | #BF4A41 / #F8E3E0 / #A03830 | #E07C72 / #3C1E1B / #F29C93 | risco real |
| `--cream` | #FCE7C3 | #3A3020 | texto de destaque sobre verde escuro |
| `--scrim` | rgba(14,21,17,.42) | rgba(0,0,0,.6) | fundo atrás de sheets e diálogos |

Sombra: claro `0 1px 2px rgba(22,33,27,.06), 0 6px 20px rgba(22,33,27,.07)`; escuro `0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.28)`. `theme-color`: #0B6B3A.

Texto colorido usa sempre os tokens `-t` (contraste WCAG AA nos dois temas). Cor de categoria: `oklch(0.6 0.13 <matiz>)` e fundo `oklch(0.6 0.13 <matiz> / 0.16)`; as matizes estão em `shared/categories.ts`.

## Tipografia

- **Nunito 800–900**: títulos e números de destaque. H1 de tela 32 px desktop, 28 px tablet, 26 px mobile (22 px no Início). Valor hero 36–56 px. `line-height` 1.15, `letter-spacing` −.01em.
- **Manrope 400–800**: interface e corpo. Corpo 14–15 px, `line-height` 1.45–1.5; rótulos 12–13 px; eyebrow 12 px, 800, maiúsculas, `letter-spacing` .05–.06em.
- `font-variant-numeric: tabular-nums` em tudo.
- **Ícones:** Material Symbols Rounded, 18–22 px (16 px em chips); `FILL 1` para item ativo.

## Espaço, raios e toque

- Espaçamento: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24. Padding de card 16–22 px; gap entre cards 12–16 px.
- Raios: 8 (botão de ícone pequeno) · 12 (botões, campos, navegação) · 14 · 16 · 18 · 20 · 22 (cards de seção) · 24 (sheet, card de resumo) · 999 (chips e pills).
- Alvo de toque mínimo 44 × 44 px; botão primário 46–54 px.

## Layout responsivo

| Faixa | Largura | Navegação | Conteúdo |
|---|---|---|---|
| Mobile | < 600 px | header sticky com kicker 13 px + título; barra inferior com Início, Gastos, botão central do assistente, Plano, Metas, Contas | uma coluna, padding 16 px, sheets sobem de baixo (raio 24 px, alça 40 × 5) |
| Tablet | 600–1023 px | rail lateral de 80 px (ícone + rótulo) e botão do assistente; o assistente abre como gaveta à direita | duas colunas quando fizer sentido |
| Desktop | ≥ 1024 px | sidebar de 236 px (logo, 5 áreas, Assistente, Planos, Configurações, card do plano e perfil); assistente fixo à direita (368 px), aberto por padrão a partir de 1280 px | grade de 12 colunas, até 1240 px; sheets viram painel lateral de 440–460 px |

Sem rolagem horizontal de página. Abas em pílula rolam na horizontal. Respeitar `env(safe-area-inset-*)`. Puxar para atualizar no mobile. Deslizar item da lista para recategorizar ou marcar para cancelar.

Item de navegação ativo: fundo `--brand-soft`, texto `--brand-t`, peso 800, ícone preenchido.

## Componentes

| Componente | Regra |
|---|---|
| Card de resumo | valor grande (Nunito 900), rótulo, variação com ícone `south`/`north_east` e cor `-t` |
| Barra de teto | trilho `--surface2` 12 px, preenchimento `--good` ou `--warn`, marcador de 3 px `--ink` no ritmo esperado do dia |
| Card de ação | ícone 44 px em fundo `-soft`, eyebrow colorido, título 16 px 800, custo ou economia, CTA em `--surface2` |
| Badge de prioridade | ícone + texto, nunca só cor: Pagar agora `priority_high` (brand) · Parcelar `calendar_view_month` (accent) · Negociar `handshake` (warn) · Cortar `content_cut` (neutro) |
| Abas de seção | pílulas 44 px; selecionada com fundo `--ink` e texto `--bg` |
| Comparador de rotas | 2–3 cards; a mais barata com saída tem borda 2 px `--good` e selo |
| Fases da jornada | 4 etapas, a atual em `--brand` / `--brand-soft` |
| Chat | bolha do usuário `--brand` (raio 18 18 6 18); do assistente `--surface2` (18 18 18 6); cards ricos em `--surface` com sombra |
| Botão de áudio | 56 px `--accent`; gravando: barras com `pp-wave` e pulso `pp-pulse` |
| Upload | área tracejada; ao arrastar, borda `--brand-t` e fundo `--brand-soft` |
| Estados | vazio com mascote e duas ações; skeleton com shimmer 1,4 s; erro em `--warn-soft` com "Tentar de novo" |
| Paywall | prévia real borrada atrás, card com selo "Recurso do plano X", benefícios e "Assinar o X · R$ XX/mês" |
| Toast | `--ink` com texto `--bg`, 3,2 s, entra com `pp-up` |

## Movimento

`pp-up` (.2 s) para entradas e toasts; `pp-sheet` (.22 s) para sheets; barras com `transition: width .35s ease`; shimmer 1,4 s linear. `prefers-reduced-motion` desliga as animações. Foco visível: outline 3 px `--accent`, offset 2 px.

## Acessibilidade

WCAG AA nos dois temas. Gráficos com `role="img"` e `aria-label` com o resumo do dado. Abas com `role="tab"` e `aria-selected`; diálogos com `aria-modal`. Mudanças de "cabe / não cabe" anunciadas com `aria-live`. Layouts em flex/grid com quebra para suportar fonte ampliada.

## Marca

`client/public/logo.png` (esquilo piloto) é o ícone do app, o avatar do assistente e o favicon. Logos de bancos são placeholders (quadrado com iniciais na cor do banco) até termos os oficiais licenciados.
