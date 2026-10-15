# Handoff: PayPilot — app web + mobile (iOS/Android)

## Overview
PayPilot é um copiloto financeiro para quem tem renda mas fecha o mês no vermelho. Junta contas e cartões, mostra para onde vai o dinheiro, decide com o usuário o que pagar primeiro e traça a saída das dívidas. Não é banco, não vende crédito, não recomenda investimentos. Receita só por assinatura (Grátis / Plus / Pilot).

Escopo deste pacote: onboarding (Open Finance e upload), Início, Gastos, Plano, Metas, Contas, Assistente (chat + WhatsApp), Planos/paywall e Perfil — em mobile (390 px), tablet (834 px) e desktop (1440 px), claro e escuro.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento, não código de produção. A tarefa é **recriar estas telas no ambiente do código-alvo** (ex.: React Native/Expo para mobile + React/Next para web, ou Flutter) usando seus padrões e bibliotecas. Se ainda não houver base, recomenda-se um monorepo com React Native (Expo) + React Native Web ou Next.js compartilhando tokens e lógica.

Cada `.dc.html` abre direto no navegador. `PayPilot.dc.html` é o app completo e navegável; `Telas.dc.html` é a prancha com todos os quadros; `Design System.dc.html` documenta componentes em claro e escuro.

## Fidelity
**High-fidelity.** Cores, tipografia, espaçamentos, copy e interações são finais. Recriar com precisão. Valores monetários e preços (`R$ XX/mês`) são dados de exemplo.

## Navegação e layout responsivo
Rotas por hash: `#rota/sub/demo~tema` (ex.: `#plano/prioridades`, `#inicio~escuro`). A última rota fica salva em `localStorage['pp-route']`.

Breakpoints (largura da janela):
- **mobile < 768 px**: header sticky (kicker 13px + título), conteúdo em coluna, padding 16px, **tab bar inferior** com 5 itens (Início, Gastos, Plano, Metas, Contas) + botão do assistente. Safe areas via `env(safe-area-inset-*)`. Pull-to-refresh nas telas principais. Sheets sobem de baixo (raio 24px no topo, alça 40×5).
- **tablet 768–1199 px**: rail lateral de 80px (ícone + rótulo 12px), conteúdo em 2 colunas.
- **desktop ≥ 1200 px**: sidebar de 236px (logo, 5 itens, Assistente, Perfil, card do plano/fase), conteúdo até ~1100px; o assistente pode abrir como painel fixo à direita. Sheets viram painel lateral direito de 440px.

Itens de navegação: altura mín. 44px, raio 12px; ativo = fundo `--brand-soft`, texto `--brand-t`, peso 800, ícone preenchido (`FILL 1`).

## Screens / Views
(Referência exata de layout e copy em cada arquivo.)

**Onboarding** (`Onboarding.dc.html`) — boas-vindas → cadastro e segurança (biometria) → escolher forma de conectar → escolher banco → consentimento Open Finance (o que lemos / não lemos, validade) → redirecionando → sucesso → Raio-X do mês. Caminho alternativo: upload OFX/CSV/PDF (arrastar e soltar na web; arquivos/câmera no app) → lendo → resumo da leitura.

**Início** (`Inicio.dc.html`) — ordem fixa: card resumo do mês ("Faltam R$ 8.400" / "Cabe"), progresso do dia no mês, renda × compromissos em barras; "O que fazer agora" (máx. 3 cards de ação); tetos em risco com ritmo projetado; progresso do plano (4 fases + data de quitação); próximos vencimentos (14 dias). Estados: carregando (skeleton com shimmer), vazio, erro com ação. Desktop: grade; mobile: empilhado.

**Gastos** (`Gastos.dc.html`) — abas: Por categoria (donut + lista, filtros fixo/variável/essencial/supérfluo, conta, grupo), Transações (+ detalhe), Tetos (barra com marcador de ritmo esperado no dia), Caçador de vazamentos (assinaturas duplicadas/sem uso → passo a passo de cancelamento → economia confirmada), Check-in de assinaturas (cartas "Usei / Não usei").

**Plano** (`Plano.dc.html`) — abas:
- *Prioridades do mês* (tela mais importante): resumo sticky no mobile com "Cabe: sobram X / Não cabe: faltam X", renda, a pagar e custo das escolhas, barra com marcador da renda. Sugestões tracejadas para cobrir o buraco. 4 seções: Pagar agora, Parcelar, Negociar ou esperar, Cortar. Mobile: segmented de 4 abas + lista; tablet: 2 colunas; desktop: kanban de 4 colunas com drag-and-drop (coluna válida destaca em `--brand-soft` com borda tracejada). Botão "Mover" abre sheet/painel com as 4 opções, impacto e custo de cada; opções inválidas desabilitadas (opacidade .5). Toast confirma o movimento e o novo saldo.
- *Mapa de crédito*: linha do tempo de fechamento (ponto cheio) e vencimento (anel laranja) por cartão + marcador de hoje; cards com limite usado/livre, taxa (badge colorido por custo) e datas.
- *Otimizador de rolagem*: escolhe a conta a pagar → 3 rotas lado a lado (custo total, fôlego ganho, impacto em novembro, aviso). Rota mais barata com saída tem borda `--good` e selo. Lateral: custo da rolagem do mês e tendência (6 meses). Tom nunca incentiva rolar; CTA leva ao plano de quitação.
- *Plano de quitação*: 4 fases (atual destacada), KPIs (dívida total, juros, data livre, economia vs mínimo), dívidas da mais cara para a mais barata com barra temporal e data de quitação.
- *Renegociação*: escolher dívida, faixa sugerida à vista, slider 6–36 meses, comparação Antes × Depois, script copiável para o banco.
- Recursos Pilot bloqueados mostram `Paywall` com prévia real do valor.

**Metas** (`Metas.dc.html`) — lista (individual e em grupo), criar meta, meta em grupo com participantes e contribuições.

**Contas** (`Contas.dc.html`) — Conectadas (status de sync, consentimento e renovação), Importações, Contas manuais, Dívidas pessoais (ex.: irmão, mãe), Grupos de despesa.

**Assistente** (`Assistente.dc.html`) — chat com bolhas, chips de sugestão acima do campo, botão de áudio com estado gravando (onda animada + pulso), card rico de confirmação de gasto (Confirmar / Mudar categoria), mini-barra de teto, impacto no plano. Tela de configuração do WhatsApp.

**Planos** (`Paywall.dc.html`) — comparativo Grátis / Plus / Pilot (Pilot destacado), e bloqueio elegante por recurso.

**Perfil** (`Perfil.dc.html`) — dados pessoais, assinatura, aparência (Claro/Escuro/Sistema), notificações, segurança (biometria, sessões ativas), privacidade (exportar dados, apagar tudo com confirmação), ajuda, sair.

## Interactions & Behavior
- Cálculos (cabe/não cabe, custos de parcelar/adiar, rotas, quitação) vêm do **motor financeiro**, nunca de estimativas da IA. Os protótipos usam dados fixos da persona Marcos.
- Mover item em Prioridades recalcula na hora e anuncia via `aria-live`.
- Toast: 3,2s, entra com `pp-up` (.2s).
- Sheet: `pp-sheet` .22s ease; scrim `--scrim`.
- Barras: `transition: width .35s ease`.
- Skeleton: shimmer 1.4s linear infinito.
- Gravação de áudio: `pp-wave` nas barras, `pp-pulse` no botão.
- `prefers-reduced-motion` desliga animações.
- Foco visível: outline 3px `--accent`, offset 2px.

## State Management
Global: rota/sub/demo, tema (claro/escuro/sistema), plano de assinatura (Grátis/Plus/Pilot), breakpoint, painel do assistente aberto.
Por tela: Prioridades → mapa `itemId → seção`, item sendo movido/arrastado; Rolagem → conta escolhida e rota; Renegociação → dívida e nº de parcelas; Assistente → mensagens, gravando; Perfil → biometria, sessões, confirmação de exclusão.
Dados: Open Finance (contas, cartões, faturas, limites, consentimentos), importações de arquivos, transações categorizadas, tetos, assinaturas, metas, dívidas manuais.

## Design Tokens
Tema definido por `data-theme` com variáveis CSS.

| Token | Claro | Escuro |
|---|---|---|
| --bg | #F5F2EA | #0D1410 |
| --surface | #FFFFFF | #151F19 |
| --surface2 | #EEEAE0 | #1D2922 |
| --line | #E2DDD1 | #2B3931 |
| --ink | #16211B | #ECF1ED |
| --ink2 | #46534B | #B4C0B8 |
| --ink3 | #626D66 | #93A097 |
| --brand | #0B6B3A | #46B97A |
| --brand-on | #FFFFFF | #05200F |
| --brand-t (texto) | #0B6B3A | #6FCF98 |
| --brand-soft | #E1EFE5 | #163524 |
| --brand-deep | #0A4F2C | #0B5A31 |
| --accent | #E9822A | #F0954A |
| --accent-soft | #FCEBD6 | #3A2614 |
| --accent-t | #9C4B0B | #F6B47C |
| --good / -soft / -t | #1E8C4E / #DCF2E3 / #16703D | #4FC285 / #14341F / #7CD8A5 |
| --warn / -soft / -t | #C98A0B / #FBEFD2 / #7F5300 | #E2A93B / #382B10 / #F0C467 |
| --risk / -soft / -t | #BF4A41 / #F8E3E0 / #A03830 | #E07C72 / #3C1E1B / #F29C93 |
| --cream | #FCE7C3 | #3A3020 |
| --scrim | rgba(14,21,17,.42) | rgba(0,0,0,.6) |

Sombra: claro `0 1px 2px rgba(22,33,27,.06), 0 6px 20px rgba(22,33,27,.07)`; escuro `0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.28)`.
`theme-color`: #0B6B3A.

Prioridade (badge = ícone + texto, nunca só cor): Pagar agora `priority_high` brand · Parcelar `calendar_view_month` accent · Negociar `handshake` warn · Cortar `content_cut` neutro.

**Tipografia**
- Títulos/números de destaque: **Nunito** 800–900. H1 de tela 28–32px desktop / 24px mobile, lh 1.15, ls −.01em. Valor hero 36–56px.
- UI/corpo: **Manrope** 400–800. Corpo 14–15px lh 1.45–1.5; rótulos 12–13px; eyebrow 12px 800 uppercase ls .05–.06em.
- `font-variant-numeric: tabular-nums` global.
- Ícones: **Material Symbols Rounded**, 18–22px (16 em chips), FILL 0 / 1 para ativo.

**Espaçamento**: escala 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24. Padding de card 16–18px; gap entre cards 12–16px.

**Raios**: 8 (botão ícone pequeno) · 12 (botões, inputs, nav) · 14 · 16 · 18 · 20 · 22 (cards de seção) · 24 (sheet) · 999 (chips/pills).

**Alvos de toque**: mínimo 44×44px; botões primários 46–50px.

## Acessibilidade
WCAG AA em claro e escuro (usar tokens `-t` para texto colorido). Gráficos com `role="img"` + `aria-label` com resumo textual. Suporte a fonte ampliada (layouts flex/grid com wrap). Abas com `role="tab"`/`aria-selected`; diálogos com `aria-modal`.

## Assets
- `assets/logo.png` — ícone do app (esquilo piloto) fornecido pelo cliente; também usado como avatar do assistente e favicon.
- Logos de bancos: placeholders (quadrado com iniciais na cor da marca). Substituir por logos oficiais licenciados.
- Fontes: Google Fonts (Nunito, Manrope, Material Symbols Rounded).

## Dados de exemplo
Persona Marcos, 38 anos, renda R$ 34.000, compromissos R$ 46.500 em outubro; cartões Nubank, Itaú, Santander, XP + cartão manual da mãe (Helena); rotativo R$ 12.300; empréstimo R$ 28.000; impostos 48× R$ 890; 11 assinaturas (R$ 612/mês); teto Uber R$ 990/1.000 no dia 15; metas Réveillon R$ 5.000 e viagem do casal R$ 30.000.

## Screenshots
`screenshots/` traz 25 capturas a ~920 px (layout tablet, com o rail lateral), cobrindo onboarding, todas as abas de Gastos e Plano, Metas, Contas, Assistente, Planos, Perfil e o modo escuro. Para ver os layouts mobile (390 px) e desktop (1440 px), abra `Telas.dc.html`, onde cada quadro é o app real.

## Files
- `PayPilot.dc.html` — shell do app (rotas, navegação, tema, tokens).
- `Onboarding.dc.html`, `Inicio.dc.html`, `Gastos.dc.html`, `Plano.dc.html`, `Metas.dc.html`, `Contas.dc.html`, `Assistente.dc.html`, `Paywall.dc.html`, `Perfil.dc.html` — telas.
- `Design System.dc.html` — componentes em claro e escuro.
- `Telas.dc.html` — prancha com todos os quadros (mobile, tablet, desktop, escuro, fluxos).
- `support.js` — runtime para abrir os protótipos no navegador.
- `uploads/` — brief e plano de produto originais.
