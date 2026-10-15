# Roadmap e status de implementação

As etapas e portões vêm de [produto.md](produto.md#roadmap-em-etapas). Esta página diz o que já existe no código e o que falta em cada módulo.

Legenda: **Pronto** = funciona de ponta a ponta com dados reais do usuário · **Parcial** = tela e regras prontas, falta integração externa · **Falta** = não iniciado.

## Etapa 0 · Validar (4 semanas, antes de código de produção)

Itens da spec que não são código e seguem pendentes:

- [ ] Entrevistar 20 a 30 pessoas endividadas com renda boa
- [ ] Pedir extratos e faturas reais (anonimizados) a 5 delas para testar importação e caçador
- [x] Protótipo clicável das telas principais (`design_handoff_paypilot/`)
- [ ] Página de lista de espera com os três planos e teste de preço
- [ ] Cotar Pluggy, Belvo e outros agregadores
- [x] Escrever as regras do motor de priorização e da rolagem ([motor-financeiro.md](motor-financeiro.md)); validar com exemplos reais
- [ ] Definir equipe e stack (a stack atual está em [arquitetura.md](arquitetura.md), a validar)
- [ ] Consultar advogado sobre LGPD, termos de uso e o limite com consultoria de investimentos

## Módulos

| Módulo | Etapa | Plano | Status | O que falta |
| --- | --- | --- | --- | --- |
| Importação de arquivos | 1 · MVP | Grátis | Parcial | OFX e CSV prontos. PDF e foto dependem do provedor de IA (`OPENAI_API_KEY`); sem ele o arquivo fica "pendente". |
| Open Finance | 2 · Conectar | Grátis (1), Plus/Pilot | Parcial | Fluxo completo de consentimento com provedor `sandbox`. Falta contratar e plugar o agregador real. |
| Contas manuais | 1 · MVP | Plus | Pronto | Leitura da foto da fatura depende do provedor de IA. |
| Categorização automática | 1 · MVP | Grátis | Pronto | Dicionário padrão + regras aprendidas com correções. |
| Dashboard mensal | 1 · MVP | Grátis | Pronto | Estados carregando, vazio e erro. |
| Tetos por categoria | 1 · MVP | Plus | Pronto | Alertas push dependem do app nativo; WhatsApp depende da Cloud API. |
| Caçador de vazamentos | 1 · MVP | Grátis (resumo), Plus | Pronto | — |
| Detector de assinaturas sem uso | 1 (check-in) a 4 | Plus | Parcial | Check-in pronto. Tempo sem abrir app (Android) e recibos por e-mail são da etapa 4. |
| Grupos de despesa | 3 · Diferenciar | Pilot | Pronto | — |
| Motor de priorização | 2 · Conectar | Pilot | Pronto | Compromissos novos são derivados das importações; falta tela para criar compromisso à mão. |
| Plano de quitação | 2 · Conectar | Pilot | Pronto | — |
| Dívidas pessoais | 1 · MVP | Plus | Pronto | — |
| Otimizador de rolagem | 3 · Diferenciar | Pilot | Pronto | — |
| Simulador de renegociação | 3 · Diferenciar | Pilot | Pronto | — |
| Metas | 2 · Conectar | Plus | Pronto | — |
| Metas em grupo | 4 · Expandir | Pilot | Parcial | Convite registrado; falta o aceite pelo outro participante e a cobrança por participante (ponto em aberto da spec). |
| Assistente no app | 1 · MVP | Grátis (limitado), Plus/Pilot | Pronto | Interpretação por regras em português; IA opcional para pedidos livres, áudio e foto. |
| Assistente no WhatsApp | 2 · Conectar | Plus | Parcial | Vinculação, alertas e webhook prontos; falta conta na Meta (tokens) e aprovação de templates. |
| Planos e assinatura | 2 · Conectar | — | Parcial | Bloqueios e paywall prontos. Falta cobrança pelas lojas ou pelo site; preços a definir no teste de preço. |
| App nativo iOS/Android | 2 · Conectar | — | Falta | React Native reaproveitando `shared/`. Biometria e push dependem dele. |

## Pontos em aberto da spec

- Valores dos planos e desconto anual.
- Metas em grupo: cobrança por participante ou conta familiar.
- Assinatura dentro das lojas ou também pelo site.
