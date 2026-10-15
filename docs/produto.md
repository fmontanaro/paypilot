# PayPilot — Plano completo do produto

> Fonte da verdade do produto. Toda decisão de código e design segue este documento. Mudanças no produto começam aqui.

Oct 14, 2026 · @Flavio Montanaro

## Visão e princípios

O PayPilot é um copiloto financeiro para quem tem renda, mas fecha o mês no vermelho. Ele junta todas as contas e cartões, decide com o usuário o que pagar primeiro e traça um plano mês a mês até sobrar dinheiro.

**Problema.** A maioria das famílias brasileiras está endividada (número exato a confirmar na pesquisa Peic da CNC). Muitas têm boa renda, mas os compromissos superam a entrada todo mês. Para fechar a conta, fazem rolagem entre cartões e empréstimos de cabeça, sem saber o custo de cada manobra.

**Público inicial.** Pessoas com renda média ou alta, várias fontes de crédito, gastos espalhados em vários cartões e dívidas fora do sistema bancário (família, empresa parada).

**Princípios do produto**

- **Receita só de assinatura.** O PayPilot não vende crédito, seguro ou investimento e não recebe comissão de ninguém.
- **Nunca recomenda investimento.** Ele ajuda a gerar a sobra; o destino dela é decisão do usuário.
- **Custo à vista, decisão do usuário.** Toda sugestão mostra quanto custa em juros, multa ou risco de negativação.
- **Automático primeiro.** O usuário conversa (no app ou no WhatsApp) e o PayPilot organiza.
- **Privacidade como padrão.** O usuário escolhe o que conecta e o que compartilha, inclusive com a família.

## Funcionalidades

O produto tem 18 módulos em quatro grupos: entrada de dados, controle do mês, saída das dívidas e conversa com o assistente. A coluna Etapa indica em que fase do roadmap cada um é construído.

| Módulo | O que faz | Plano | Etapa |
| --- | --- | --- | --- |
| **Entrada de dados** |  |  |  |
| Importação de arquivos | Lê extratos e faturas em OFX, CSV e PDF e monta o histórico. Lembra o usuário de enviar o extrato do mês. | Grátis | 1 · MVP |
| Open Finance | Conecta contas e cartões via agregador, com atualização automática. | Grátis (1 conta), Plus e Pilot (várias) | 2 · Conectar |
| Contas manuais | Cartões e contas fora do Open Finance (ex.: cartão emprestado de um familiar): lança gastos ou lê a foto da fatura e mostra o limite usado. Reconhece a transferência de pagamento para não contar o gasto duas vezes. | Plus | 1 · MVP |
| Categorização automática | Classifica cada transação (fixo, variável, essencial, supérfluo) e aprende com as correções do usuário. | Grátis | 1 · MVP |
| **Controle do mês** |  |  |  |
| Dashboard mensal | Gastos por categoria e tipo, entradas versus compromissos e o "buraco" do mês. | Grátis | 1 · MVP |
| Tetos por categoria | Limite por categoria com ritmo do mês: "R$ 990 de R$ 1.000 em Uber no dia 15; no ritmo atual, R$ 2.000". | Plus | 1 · MVP |
| Caçador de vazamentos | Acha assinaturas (inclusive repetidas em cartões diferentes), tarifas escondidas, anuidades, seguros e cobranças duplicadas, e explica como cancelar. | Grátis (resumo), Plus (completo) | 1 · MVP |
| Detector de assinaturas sem uso | Check-in "usou isso no último mês?", sinais nos dados (teste grátis virou cobrança, aumento de preço), tempo sem abrir o app no Android e leitura de recibos por e-mail. | Plus | 1 (check-in) a 4 (Android, e-mail) |
| Grupos de despesa | Centros de custo que atravessam contas (ex.: empresa parada), com regras automáticas, obrigações fixas e custo mensal e anual. | Pilot | 3 · Diferenciar |
| **Saída das dívidas** |  |  |  |
| Motor de priorização | Classifica cada conta do mês em pagar agora, parcelar, negociar ou esperar e cortar, sempre com o custo de cada escolha. | Pilot | 2 · Conectar |
| Plano de quitação | Jornada em quatro fases (fechar o mês, estabilizar, quitar, gerar sobra), dívidas atacadas da mais cara para a mais barata e data prevista de quitação. | Pilot | 2 · Conectar |
| Dívidas pessoais | Saldo devedor com pessoas (ex.: um familiar): cada pagamento abate, um mesmo pagamento pode ser dividido entre fatura e dívida. | Plus | 1 · MVP |
| Otimizador de rolagem | Mapa de todo o crédito (limites, fechamento, vencimento, taxas), rotas mais baratas para fechar o mês, custo da manobra, dias de fôlego e evolução da "ciranda" mês a mês. | Pilot | 3 · Diferenciar |
| Simulador de renegociação | Calcula quanto oferecer e quando trocar dívida cara por crédito mais barato, sem indicar nem vender produto. | Pilot | 3 · Diferenciar |
| Metas | Meta individual com valor mensal, de onde tirar o dinheiro e o impacto no plano de quitação. | Plus | 2 · Conectar |
| Metas em grupo | Meta compartilhada (casal, família) com divisão igual ou proporcional à renda e privacidade escolhida por cada um. | Pilot | 4 · Expandir |
| **Conversa** |  |  |  |
| Assistente no app | Chat para registrar gastos ("comprei um suco de R$ 12,90"), consultar ("quanto falta no teto de Uber?") e perguntar "posso gastar isso?". | Grátis (limitado), Plus e Pilot | 1 · MVP |
| Assistente no WhatsApp | O mesmo assistente por texto, áudio e foto de nota, mais alertas de teto e vencimento. | Plus | 2 · Conectar |

## Planos de assinatura

São três planos: o Grátis mostra o problema, o Plus organiza o mês e o Pilot tira o usuário das dívidas. Os preços saem de um teste com usuários na etapa de validação.

| Plano | Para quem | Inclui | Preço |
| --- | --- | --- | --- |
| Grátis | Quem quer ver para onde o dinheiro vai | 1 conta via Open Finance ou importação de arquivos sem limite, categorização, dashboard, resumo do caçador de vazamentos, assistente no app com limite de mensagens | R$ 0 |
| Plus | Quem quer controlar o mês | Várias contas e cartões, contas manuais, dívidas pessoais, tetos com alertas, caçador de vazamentos completo, metas, relatórios e dicas, assistente no WhatsApp | A definir |
| Pilot | Quem precisa sair das dívidas | Tudo do Plus, mais motor de priorização, plano de quitação, otimizador de rolagem, simulador de renegociação, grupos de despesa e metas em grupo | A definir |

**Por que o Grátis limita o Open Finance e não a importação:** o agregador cobra por conexão, enquanto a importação de arquivos não tem custo variável relevante. Assim o plano grátis é generoso sem dar prejuízo.

**Pontos em aberto**

- Valores dos planos e se haverá desconto anual.
- Se metas em grupo cobram de cada participante ou de uma conta familiar.
- Assinatura dentro das lojas (Apple e Google cobram taxa) ou também pelo site.

## Arquitetura técnica e stack

A decisão central: todo número sai de um motor financeiro com regras fixas, e a IA só entende o que o usuário pediu e explica o resultado. Assim a IA nunca inventa um valor de juros ou uma data de quitação.

```
 Canais                  Backend PayPilot                         Serviços externos
 ┌──────────────┐        ┌──────────────────────────────────┐     ┌──────────────────────────┐
 │ App (iOS/And)│──┐     │ Assistente (IA: entende/explica)  │◄───►│ Provedor de IA (API)      │
 │ Web          │──┼────►│   └─ ferramentas ─► Motor financ. │     └──────────────────────────┘
 │ WhatsApp     │──┘     │ Ingestão (arquivos, OF, mensagens)│◄───►│ Agregador Open Finance    │
 └──────────────┘        │ Base única por usuário (Postgres) │     │ WhatsApp Cloud API (Meta) │
                         └──────────────────────────────────┘     └──────────────────────────┘
```

O app e o WhatsApp falam com o mesmo assistente; dados de bancos, arquivos e mensagens entram pela ingestão e ficam numa base única por usuário.

**Stack sugerida (a validar com a equipe)**

- **App:** React Native ou Flutter, um código para iOS e Android. Unity não é indicado para um app de formulários e gráficos.
- **Backend:** TypeScript (Node) ou Python, com PostgreSQL e uma fila para importações e sincronizações demoradas.
- **Motor financeiro:** módulo próprio com testes automatizados para cada regra de priorização e rolagem, usando casos reais anonimizados.
- **IA:** um modelo de linguagem via API para chat, leitura de PDF e foto de fatura e transcrição de áudio, com ferramentas que chamam o motor em vez de calcular sozinho.
- **WhatsApp:** WhatsApp Business Platform (Cloud API da Meta), cobrada por mensagem enviada pela empresa.
- **Infra:** nuvem com região no Brasil, criptografia de dados, logs de acesso e backups.
- **Assinaturas:** cobrança pelas lojas (Apple e Google) e, se fizer sentido, também pelo site.

## Regulação, segurança e riscos

Três regras externas moldam o produto: Open Finance só via instituição autorizada, WhatsApp só com assistente ligado ao próprio serviço e LGPD em tudo.

- **Open Finance.** Só instituições reguladas recebem os dados diretamente, então o PayPilot usa um agregador autorizado (Pluggy, Belvo ou similar). Desenvolvedores relatam mensalidades base entre R$ 2.500 e R$ 6.000 ([relato](https://www.tabnews.com.br/GuilhermeVieira/estou-desenvolvendo-um-app-de-financas-pessoais-e-nao-consigo-pagar-o-open-finance-pluggy-r2-5k-mes-belvo-r6k-mes-tecnospeed-r1-5k-de-entrada-r540)); valores a confirmar em cotação. É o principal motivo para o MVP começar pela importação de arquivos.
- **WhatsApp.** Desde 15 de janeiro de 2026 a Meta proíbe chatbots de IA de uso geral na API do WhatsApp Business; assistentes que fazem parte do serviço de uma empresa seguem permitidos ([respond.io](https://respond.io/pt/blog/whatsapp-general-purpose-chatbots-ban)). O assistente do PayPilot deve responder só sobre as finanças do usuário e recusar conversa geral.
- **LGPD.** Consentimento explícito por fonte de dados, finalidade clara, exclusão total a pedido, encarregado de dados nomeado, criptografia em repouso e em trânsito, e contrato com o provedor de IA sem uso dos dados para treino.
- **Não é consultoria de investimentos.** O app não cita produto, ativo ou instituição para aplicar a sobra. Isso vale para os textos do assistente e para os termos de uso.

| Risco | Mitigação |
| --- | --- |
| O otimizador de rolagem incentivar a ciranda em vez de encerrá-la | Sempre mostrar o custo acumulado da rolagem e se ela encolheu ou cresceu no mês; o plano de quitação define a saída |
| A IA errar um número | O motor financeiro calcula tudo de forma determinística; a IA só interpreta pedidos e explica resultados |
| Custo do agregador antes de ter receita | MVP com importação de arquivos; Open Finance entra com a assinatura paga |
| Meta reinterpretar a política do WhatsApp | O app é o canal principal; o WhatsApp é um atalho que pode ser desligado sem perder funções |
| Vazamento de dados financeiros | Revisão de segurança antes do beta, menor coleta possível, sem guardar senhas de banco |
| Usuário desistir porque importar arquivos dá trabalho | Registro por chat e WhatsApp, lembretes mensais e caçador de vazamentos com ganho logo na primeira semana |

## Roadmap em etapas

O PayPilot chega ao produto completo em cerca de 36 semanas, em cinco etapas. Cada etapa só começa quando a anterior passa no seu portão, para não construir o que ninguém vai usar.

```
 Validar (4 sem) ─┤portão├─ MVP (12 sem) ─┤portão├─ Conectar (10 sem) ─┤portão├─ Diferenciar (10 sem) ─┤portão├─ Expandir (contínuo)
```

O MVP começa pela importação de arquivos para validar o valor antes de pagar o agregador de Open Finance.

1. **Validar (4 semanas).** Entrevistas com pessoas endividadas, análise de extratos reais, protótipo clicável, lista de espera com teste de preço, cotação dos agregadores e regras escritas do motor de priorização e da rolagem. **Portão:** a maioria dos entrevistados reconhece a dor e a lista de espera cresce.
2. **MVP (12 semanas).** Cadastro e segurança, importação de OFX, CSV e PDF, categorização automática, dashboard mensal, tetos com ritmo, caçador de vazamentos com check-in de uso, contas manuais, dívidas pessoais e chat no app para registrar e consultar. Beta fechado com a lista de espera. **Portão:** usuários do beta seguem usando depois de 4 semanas e encontram economia real.
3. **Conectar (10 semanas).** Integração com o agregador de Open Finance, motor de priorização, plano de quitação em quatro fases, metas individuais, assistente no WhatsApp com áudio e foto, e cobrança dos planos Plus e Pilot. Lançamento público. **Portão:** primeiros assinantes pagantes.
4. **Diferenciar (10 semanas).** Otimizador de rolagem com mapa de crédito e rotas, simulador de renegociação e grupos de despesa com regras automáticas. **Portão:** assinantes renovam e o buraco mensal deles diminui.
5. **Expandir (contínuo).** Metas em grupo com privacidade por pessoa, detecção de apps sem uso no Android, leitura de recibos por e-mail, relatórios avançados e aquisição de usuários.

## Métricas de sucesso

A métrica principal é a melhora real da situação do usuário, medida pelo "buraco" mensal diminuindo mês após mês. As metas numéricas serão definidas com os dados do beta.

| Métrica | O que mostra |
| --- | --- |
| Buraco mensal médio | Diferença entre compromissos e renda; deve cair a cada mês de uso |
| Economia encontrada na primeira semana | Valor mensal em assinaturas e tarifas que o usuário cancelou |
| Custo da rolagem | Juros e taxas pagos para fechar o mês; deve encolher |
| Usuários que chegam à fase "gerar sobra" | Prova de que o plano funciona |
| Retenção em 30 e 90 dias | Se o hábito pegou |
| Conversão do Grátis para Plus e Pilot | Se o valor percebido paga a assinatura |
| Lançamentos por chat e WhatsApp por semana | Se registrar ficou fácil |

## Próximos passos imediatos

As próximas quatro semanas são de validação, antes de escrever código de produção.

- [ ] Entrevistar 20 a 30 pessoas endividadas com renda boa sobre como fecham o mês hoje
- [ ] Pedir a 5 delas extratos e faturas reais (anonimizados) para testar a importação e o caçador de vazamentos
- [ ] Fazer o protótipo clicável das telas principais: dashboard, prioridades do mês e rolagem
- [ ] Montar uma página de lista de espera com os três planos e medir interesse por preço
- [ ] Cotar Pluggy, Belvo e outros agregadores, incluindo mensalidade base e custo por conexão
- [ ] Escrever as regras do motor de priorização e do otimizador de rolagem com exemplos reais
- [ ] Definir equipe e stack (app, backend e provedor de IA)
- [ ] Consultar um advogado sobre LGPD, termos de uso e o limite com consultoria de investimentos
