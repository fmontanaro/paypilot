# Arquitetura técnica

Como o PayPilot está construído hoje e por quê. O produto está em [produto.md](produto.md), as regras de cálculo em [motor-financeiro.md](motor-financeiro.md) e o visual em [../design_guidelines.md](../design_guidelines.md).

## Decisão central

**Todo número sai do motor financeiro.** O motor é um conjunto de funções puras e determinísticas em `shared/engine/`, com testes automatizados. A IA (assistente no app e no WhatsApp) só entende o pedido do usuário, chama o motor como ferramenta e explica o resultado. Ela nunca calcula juros, datas de quitação ou "cabe / não cabe".

Como o motor fica em `shared/`, o mesmo código roda:

- no **servidor**, para o assistente, os alertas e os resumos;
- no **cliente**, para recalcular na hora quando o usuário move um item em Prioridades do mês, sem esperar a rede;
- no futuro **app nativo** (React Native), sem reescrever regras.

## Stack

| Camada | Escolha | Observação |
| --- | --- | --- |
| Cliente web | React 18 + TypeScript + Vite, roteamento com `wouter`, dados com TanStack Query | Responsivo em três layouts (mobile < 600 px, tablet 600–1023 px, desktop ≥ 1024 px), claro e escuro. Recria o handoff de `design_handoff_paypilot/`. |
| App nativo | React Native (Expo), etapa futura | Vai reaproveitar `shared/` (motor, catálogos, formatação e tipos). A spec pede um código para iOS e Android; o web vem primeiro porque o MVP precisa de validação rápida. |
| Backend | Node.js + TypeScript + Express | Rotas em `server/routes.ts`, com validação por `zod`. |
| Banco | PostgreSQL com Drizzle ORM | Em produção, `DATABASE_URL` (Neon/Replit). Sem `DATABASE_URL`, o servidor sobe um Postgres embutido (PGlite) em `.data/` para desenvolvimento local. |
| Migrações | `drizzle-kit generate` → pasta `migrations/`; no Replit, o Publish sincroniza o schema de desenvolvimento com produção | O servidor Postgres não executa DDL na inicialização. Apenas o PGlite local aplica migrações na subida. |
| Sessão | Cookie `httpOnly`, sessão no servidor, senha com bcrypt | Login por e-mail ou celular. A tabela `user_sessions` lista as sessões ativas no Perfil. |
| IA | Provedor via API, atrás de uma interface (`server/assistant/llm.ts`) | Sem chave configurada, o assistente usa só o interpretador por regras (em português) e continua funcionando. |
| WhatsApp | WhatsApp Business Platform (Cloud API da Meta) | Webhook em `/api/whatsapp/webhook`. Sem token configurado, o código de verificação aparece no log do servidor (modo dev). |
| Open Finance | Agregador autorizado (Pluggy, Belvo ou similar), atrás de `server/openfinance/provider.ts` | Hoje só existe o provedor `sandbox`, que simula a conexão. O agregador real entra na etapa 2 (Conectar), com contrato. |
| Testes | Vitest | Motor financeiro e leitores de arquivo (`npm test`). |

## Estrutura de pastas

```
shared/                 código comum a servidor e cliente
  schema.ts             tabelas (Drizzle) e tipos
  categories.ts         catálogo de categorias (ícone, cor, fixo/variável, essencial/supérfluo)
  plans.ts              planos Grátis / Plus / Pilot e o que cada um libera
  format.ts             moeda (R$ 1.234,56) e datas em pt-BR
  banks.ts              instituições (cor e iniciais) usadas no app
  demo/persona.ts       persona Marcos do handoff, usada pelo seed e pelos testes
  engine/               MOTOR FINANCEIRO (funções puras + testes)
server/
  index.ts              sobe o Express, sessão, migrações e o Vite em dev
  db.ts                 conexão Postgres ou PGlite
  auth.ts               cadastro, login, sessão, conta de demonstração
  storage.ts            acesso a dados por usuário (todas as consultas filtram userId)
  routes.ts             rotas da API, agrupadas por área (conta, gastos, plano, metas, contas, assistente, WhatsApp)
  session-store.ts      sessões do express-session guardadas no próprio banco
  ingestion/            leitores de OFX, CSV e PDF, categorização e detecção na importação
  openfinance/          interface do agregador + provedor sandbox
  assistant/            interpretador de pedidos, ferramentas que chamam o motor, cliente de IA
  whatsapp/             vinculação do número, webhook e envio de alertas
  seed/                 grava a persona de demonstração e gera os arquivos de exemplo (OFX/CSV)
client/src/
  styles.css            tokens do design system (claro e escuro)
  app/                  shell: navegação, tema, rotas, breakpoints
  ui/                   componentes do design system (ícone, abas, sheet, toast, barras, paywall…)
  screens/              Onboarding, Início, Gastos, Plano, Metas, Contas, Assistente, Perfil
migrations/             SQL gerado pelo drizzle-kit
docs/                   produto, arquitetura, motor e roadmap
design_handoff_paypilot/  referência de design em HTML (alta fidelidade)
```

## Fluxo de dados

1. **Entrada.** Arquivos (OFX, CSV, PDF), Open Finance (sandbox por enquanto), lançamentos manuais e mensagens do assistente chegam pela ingestão.
2. **Normalização.** Cada transação recebe uma impressão digital (`fingerprint`) para não duplicar em reimportações, uma categoria (regras do usuário primeiro, depois o dicionário padrão) e marcações (tarifa evitável, cobrança duplicada, serviço repetido).
3. **Detecção.** Depois de cada importação, o motor de vazamentos (`engine/leaks.ts`) procura assinaturas, tarifas, seguros e duplicidades e atualiza a tabela `leaks` sem desfazer o que o usuário já decidiu.
4. **Leitura.** O cliente busca `GET /api/snapshot`, que devolve os dados crus do mês (contas, compromissos, decisões, transações, tetos, vazamentos, metas, dívidas). As telas montam as visões chamando o motor.
5. **Decisão.** Quando o usuário decide algo (mover um item, cancelar uma assinatura, escolher uma rota), o cliente recalcula na hora com o motor e grava a decisão na API.

## API

Todas as rotas ficam sob `/api`, falam JSON e exigem sessão, exceto cadastro, login e o webhook do WhatsApp. Recursos pagos validam o plano no servidor (`requirePlan`).

| Área | Rotas |
| --- | --- |
| Conta | `POST /auth/signup`, `POST /auth/login`, `POST /auth/demo`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `PUT /me/plan`, `GET /me/sessions`, `DELETE /me/sessions/:id`, `GET /me/export`, `DELETE /me` |
| Leitura | `GET /snapshot` |
| Gastos | `POST /transactions`, `PATCH /transactions/:id`, `POST /budgets`, `PATCH /budgets/:id`, `PATCH /leaks/:id`, `POST /subscriptions/:id/checkin` |
| Plano | `PUT /priorities/:commitmentId`, `PUT /rollover/choice` |
| Metas | `POST /goals`, `POST /goals/:id/invites`, `PATCH /goals/:id` |
| Contas | `POST /openfinance/connect`, `POST /connections/:id/sync`, `POST /connections/:id/renew`, `POST /imports`, `POST /imports/sample`, `PATCH /me` (lembrete), `POST /accounts/:id/entries`, `POST /accounts/:id/statement`, `POST /personal-debts/:id/payments`, `PATCH /category-rules/:id` |
| Assistente | `GET /assistant/messages`, `POST /assistant/messages`, `POST /assistant/actions` |
| WhatsApp | `GET /whatsapp`, `POST /whatsapp/link`, `POST /whatsapp/verify`, `PATCH /whatsapp`, `DELETE /whatsapp`, `GET|POST /whatsapp/webhook` |

## Modelo de dados

Todas as tabelas de dados pessoais têm `user_id` com `ON DELETE CASCADE`: apagar o usuário apaga tudo (LGPD).

| Tabela | Para que serve |
| --- | --- |
| `users` | Conta, plano, preferências (tema, biometria, notificações, lembrete de extrato, valor mensal para dívidas). |
| `user_sessions` | Sessões ativas (aparelho e último acesso) para o Perfil. |
| `incomes` | Fontes de renda e dia em que caem. |
| `connections` | Consentimentos de Open Finance: instituição, status de sincronização, validade. |
| `accounts` | Contas, cartões, cheque especial, empréstimos e cartões manuais: limite, uso, saldo com juros, taxas, datas de fechamento e vencimento. |
| `imports` | Histórico de arquivos enviados. |
| `transactions` | Transações categorizadas, com grupo de despesa, notas e marcações. |
| `transaction_splits` | Divisão de uma transação (ex.: parte paga a fatura do cartão manual, parte abate uma dívida pessoal). |
| `category_rules` | Regras "sempre classificar X como Y" e regras automáticas de grupos de despesa. |
| `budgets` | Tetos por categoria. |
| `subscriptions` | Assinaturas recorrentes e o check-in de uso do mês. |
| `leaks` | Itens do caçador de vazamentos e a decisão do usuário. |
| `commitments` | Compromissos do mês (contas, faturas, parcelas, impostos, dívidas pessoais, tetos e envelopes). |
| `priority_decisions` | Seção escolhida para cada compromisso em cada mês (pagar, parcelar, negociar, cortar). |
| `rollover_choices` | Rota escolhida no otimizador de rolagem. |
| `snapshots` | Foto mensal da dívida total e da data prevista de quitação, para mostrar a evolução. |
| `personal_debts`, `personal_debt_payments` | Dívidas com pessoas e o histórico de pagamentos. |
| `expense_groups`, `group_obligations` | Grupos de despesa (centros de custo) e obrigações fixas. |
| `goals`, `goal_members`, `goal_invites` | Metas individuais e em grupo, com a privacidade de cada participante. |
| `chat_messages` | Histórico do assistente (texto e cards ricos). |
| `whatsapp_links` | Número vinculado e alertas escolhidos. |

## Planos e bloqueios

`shared/plans.ts` define o que cada plano libera, seguindo a tabela de funcionalidades da spec. O servidor bloqueia escrita em recursos pagos. O cliente mostra o `Paywall` com uma prévia real calculada pelo motor ("Encontramos 3 rotas…").

A cobrança pelas lojas (Apple e Google) ou pelo site ainda não existe. Enquanto isso, `PUT /me/plan` troca o plano direto quando `ALLOW_PLAN_SWITCH=true`; em produção essa variável fica desligada e a troca responde "assinatura em breve".

## Segurança e LGPD

- Senhas com bcrypt; o PayPilot nunca recebe nem guarda senha de banco (Open Finance é por consentimento no app do banco).
- Cookie de sessão `httpOnly`, `secure` em produção, `sameSite=lax`.
- Toda consulta filtra por `user_id` da sessão (`server/storage.ts`).
- Exportar dados (`GET /me/export`) e apagar tudo (`DELETE /me`, em cascata).
- Consentimento explícito por fonte de dados, com validade e renovação visíveis em Contas.
- O assistente recusa conversa fora das finanças do usuário (exigência da Meta para o WhatsApp desde 15/01/2026) e nunca cita produto, ativo ou instituição para investir.
- Pendências antes do beta: criptografia de colunas sensíveis em repouso, revisão de segurança, encarregado de dados (DPO) nomeado e contrato com o provedor de IA sem uso dos dados para treino.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Obrigatória em produção. Sem ela, só no desenvolvimento, usa PGlite em `.data/pglite`. |
| `SESSION_SECRET` | Assinatura do cookie de sessão (obrigatória em produção). |
| `PORT` | Porta HTTP (padrão 5000; no macOS a 5000 costuma estar ocupada pelo AirPlay, use outra). |
| `PGLITE_DIR` | Pasta do PGlite (padrão `.data/pglite`). |
| `AI_MODEL`, `AI_TRANSCRIBE_MODEL`, `OPENAI_BASE_URL` | Opcionais. Modelo de interpretação e de transcrição. |
| `WHATSAPP_APP_SECRET` | Opcional. Valida a assinatura do webhook da Meta. |
| `OPENAI_API_KEY` | Opcional. Liga a IA para interpretar pedidos livres, transcrever áudio e ler PDF ou foto de fatura. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | Opcionais. Cloud API da Meta. |
| `ALLOW_PLAN_SWITCH` | `true` permite trocar de plano sem cobrança (padrão: `true` fora de produção). |
