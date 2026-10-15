# PayPilot: brief de design de interface

Brief para criar a interface e as telas do PayPilot. O produto precisa funcionar perfeitamente na **web (desktop e navegador do celular)** e como **app mobile (iOS e Android)**, com o mesmo sistema visual e a mesma lógica de navegação adaptada a cada tamanho de tela.

---

## 1. O produto em uma frase

O PayPilot é um copiloto financeiro para quem tem renda, mas fecha o mês no vermelho. Ele junta todas as contas e cartões, mostra para onde o dinheiro vai, decide com o usuário o que pagar primeiro e traça um plano mês a mês até sobrar dinheiro.

**O que ele não é:** não é banco, não vende crédito nem produto financeiro e nunca recomenda investimentos. A receita vem só de assinatura.

## 2. Público

- Pessoas com renda média ou alta (ex.: R$ 30 a 40 mil por mês) cujos compromissos superam a renda (ex.: R$ 50 mil por mês).
- Têm vários cartões e fontes de crédito e fazem "rolagem": usam um crédito para pagar outro.
- Estão cansadas, ansiosas e muitas vezes com vergonha da situação. Não leem faturas com atenção.
- Usam muito o WhatsApp e preferem falar a preencher formulários.

## 3. Tom e direção visual

**Sensação desejada:** calma, controle e progresso. A pessoa abre o app estressada e precisa sair com a sensação de "sei o que fazer agora".

- **Sem julgamento.** Nada de vermelho gritante, alertas agressivos ou linguagem de culpa. Problemas aparecem como fatos com caminho de saída: "Faltam R$ 8.400 para fechar outubro. Veja 3 formas de cobrir."
- **Confiável como um banco, humano como um amigo.** Visual limpo e sóbrio, com calor no texto e nas ilustrações.
- **Progresso sempre visível.** Mostrar o caminho percorrido (buraco do mês diminuindo, dívida caindo, data de quitação se aproximando).
- **Números grandes e legíveis.** Valores em reais são o conteúdo principal; tipografia com algarismos tabulares.
- **Cores com significado:** uma cor primária de marca (sugestão: azul-petróleo ou verde-azulado, transmitindo confiança e calma), um verde para progresso e economia, um âmbar para atenção e um vermelho suave reservado para risco real (negativação, vencimento hoje).
- **Modo claro e escuro** desde o início.
- **Idioma:** português do Brasil. Moeda no formato `R$ 1.234,56`, datas `14 out` ou `14/10/2026`.

## 4. Plataformas e responsividade

Um único sistema de design com três layouts:

| Faixa | Largura | Navegação | Layout |
| --- | --- | --- | --- |
| Mobile | até 599 px | Barra inferior com 5 abas + botão central de chat | Uma coluna, cards empilhados |
| Tablet | 600 a 1023 px | Barra lateral recolhida (só ícones) | Duas colunas quando fizer sentido |
| Desktop web | 1024 px ou mais | Barra lateral completa à esquerda; chat como painel lateral fixo à direita | Grade de 12 colunas, dashboard em várias colunas |

Requisitos:

- Áreas de toque de no mínimo 44 × 44 px no mobile.
- Respeitar safe areas (notch e barra de gestos) no app.
- Nenhuma rolagem horizontal da página; tabelas largas viram listas de cards no mobile.
- Gráficos legíveis em 360 px de largura.
- No desktop, aproveitar o espaço (dashboard em grade), sem apenas esticar o layout mobile.
- Gestos no app: puxar para atualizar, deslizar um item da lista para recategorizar ou marcar "cancelar".

## 5. Navegação principal

Cinco áreas, iguais em todas as plataformas:

1. **Início**: visão do mês e o que fazer agora.
2. **Gastos**: transações, categorias, tetos e vazamentos.
3. **Plano**: prioridades do mês, rolagem e plano de quitação.
4. **Metas**: metas individuais e em grupo.
5. **Contas**: contas conectadas, contas manuais, dívidas pessoais e grupos de despesa.

Mais: **Assistente** (chat), acessível de qualquer tela (botão central no mobile, painel lateral no desktop), e **Perfil e configurações**.

## 6. Telas

Para cada tela: objetivo, conteúdo e estados (vazio, carregando, erro, sucesso) quando relevante.

### 6.1 Onboarding

1. **Boas-vindas**: proposta de valor em uma frase e três benefícios curtos. Botões "Começar" e "Já tenho conta".
2. **Cadastro e segurança**: e-mail ou celular, senha e opção de biometria. Explicar em linguagem simples que os dados são criptografados e nunca vendidos.
3. **Como conectar seus dados**: duas opções lado a lado, com prós e contras claros:
   - **Conectar via Open Finance** (automático, seguro, autorizado pelo Banco Central).
   - **Enviar extratos e faturas** (OFX, CSV ou PDF, para quem prefere não conectar).
4. **Fluxo de conexão Open Finance**: escolher o banco, explicar o consentimento (quais dados, por quanto tempo), redirecionamento ao banco e tela de sucesso.
5. **Fluxo de upload**: área de arrastar e soltar (web) e seletor de arquivos ou câmera (app), progresso de leitura, resumo do que foi encontrado ("3 meses de extrato, 412 transações").
6. **Primeira análise ("Raio-X")**: momento de impacto após importar os dados. Mostra o buraco médio mensal, quanto vai para juros e tarifas e quantas assinaturas foram encontradas, com o CTA "Ver o que dá para cortar agora".

### 6.2 Início (dashboard)

- **Resumo do mês**: renda prevista × compromissos do mês, com o "buraco" ou a sobra em destaque. Barra mostrando o quanto do mês já passou.
- **O que fazer agora**: no máximo 3 cards de ação priorizada (ex.: "Fatura do cartão X vence em 3 dias", "Você pode economizar R$ 480/mês cancelando 4 assinaturas", "Teto de Uber em 99% e ainda é dia 15").
- **Tetos em risco**: categorias perto do limite, com ritmo projetado.
- **Progresso do plano**: fase atual da jornada (Fechar o mês → Estabilizar → Quitar → Gerar sobra) e data prevista de quitação.
- **Próximos vencimentos**: linha do tempo dos próximos 14 dias.
- No desktop: grade com esses blocos lado a lado; no mobile: cards empilhados nessa ordem.

### 6.3 Gastos

- **Visão por categoria**: gráfico (rosca ou barras) e lista de categorias com valor, % da renda e variação versus mês anterior. Filtros: fixo/variável, essencial/supérfluo, conta ou cartão, grupo de despesa.
- **Lista de transações**: busca, filtros, agrupamento por dia. Cada item mostra estabelecimento, categoria, conta ou cartão de origem e valor. Edição rápida de categoria. No mobile, deslizar para ações.
- **Detalhe da transação**: categoria, grupo, notas, opção "dividir" (ex.: parte pagamento de fatura, parte abatimento de dívida pessoal) e "criar regra para casos parecidos".
- **Tetos por categoria**: lista com barra de progresso, valor gasto/limite e projeção para o fim do mês. Criar e editar teto em um passo.
- **Caçador de vazamentos**: total mensal desperdiçado em destaque. Seções: assinaturas (agrupadas, com alerta de duplicadas em cartões diferentes), tarifas e anuidades, seguros embutidos, cobranças duplicadas. Cada item com ações: "Ainda uso", "Quero cancelar" (abre o passo a passo de cancelamento) e "Ignorar".
- **Check-in de assinaturas**: experiência leve em formato de cartas, uma por assinatura, com "Usei este mês" ou "Não usei". No Android, quando houver permissão, mostrar "não abre este app há 47 dias".

### 6.4 Plano

- **Prioridades do mês** (tela mais importante do produto): todas as contas do mês classificadas em quatro colunas ou seções:
  - **Pagar agora** (essenciais e com consequência grave)
  - **Parcelar** (com o custo do parcelamento)
  - **Negociar ou esperar** (com o custo de adiar e o risco, ex.: "adiar custa R$ 210 em juros e pode negativar seu nome")
  - **Cortar**

  O usuário pode mover itens entre seções e o total "cabe/não cabe" no mês atualiza na hora. No desktop: quadro em colunas (estilo kanban); no mobile: seções em abas ou lista agrupada.
- **Mapa de crédito**: todos os cartões, cheque especial e empréstimos com limite disponível, datas de fechamento e vencimento e custo (taxa) de cada um. Visual de linha do tempo das datas de fechamento é desejável.
- **Otimizador de rolagem**: o usuário diz o que precisa pagar e o app mostra 2 ou 3 rotas comparadas lado a lado: custo total da manobra, dias de fôlego ganhos e impacto no próximo mês. Ao lado, o indicador "custo da rolagem" do mês e se ele cresceu ou encolheu. O tom nunca deve incentivar a rolagem; sempre mostrar a saída.
- **Plano de quitação**: linha do tempo das dívidas da mais cara para a mais barata, com data prevista de quitação de cada uma e total pago em juros. Jornada em 4 fases com a fase atual destacada.
- **Simulador de renegociação**: escolher uma dívida, ver faixa sugerida de proposta e comparação "antes × depois" na parcela e no prazo.

### 6.5 Metas

- **Lista de metas** com progresso, valor mensal necessário e data.
- **Criar meta**: nome, valor, prazo, ícone. O app calcula o valor mensal e sugere de onde tirar o dinheiro (assinaturas canceláveis, tetos que podem baixar) e mostra o trade-off ("atrasa a quitação do cartão X em 2 meses").
- **Meta em grupo**: convidar participantes, escolher divisão (igual ou proporcional à renda) e definir o que cada um compartilha (só a contribuição ou também totais por categoria). Mostrar a contribuição de cada pessoa sem expor dados que ela não liberou.

### 6.6 Contas

- **Contas conectadas**: bancos e cartões via Open Finance com status de sincronização e validade do consentimento.
- **Importações**: histórico de arquivos enviados e lembrete do próximo envio.
- **Contas manuais**: ex.: cartão emprestado de um familiar. Limite, gastos lançados, valor a transferir ao dono e foto ou PDF da fatura.
- **Dívidas pessoais**: dívida com pessoas (ex.: um familiar). Saldo, histórico de pagamentos, previsão de quitação.
- **Grupos de despesa**: centros de custo como "Minha empresa": total do mês, custo anual, obrigações fixas (parcelamento de impostos com parcelas restantes, contabilidade, taxas) e regras automáticas de classificação.

### 6.7 Assistente (chat)

- Conversa estilo mensageiro, com entrada por texto, **áudio** (botão de microfone em destaque) e **foto** (nota fiscal, fatura).
- Exemplos de uso para mostrar nas telas:
  - "Comprei um suco de R$ 12,90" → card de confirmação com a categoria sugerida e botões "Confirmar" e "Mudar categoria".
  - "Quanto falta no meu teto de Uber?" → resposta com mini-barra de progresso.
  - "Posso gastar R$ 600 num jantar sábado?" → resposta com o impacto no mês e no plano.
- Respostas podem conter cards ricos (mini-gráficos, listas, botões de ação), não só texto.
- Sugestões de perguntas como chips acima do campo de digitação.
- Tela de configuração do **WhatsApp**: conectar o número, explicar o que dá para fazer por lá e quais alertas chegam (tetos, vencimentos).

### 6.8 Planos e assinatura

- Comparativo de três planos: **Grátis**, **Plus** e **Pilot**, com o Pilot destacado para quem tem dívidas.
  - Grátis: 1 conta via Open Finance ou importação de arquivos, dashboard, categorização, resumo de vazamentos, assistente limitado.
  - Plus: várias contas, contas manuais, dívidas pessoais, tetos e alertas, vazamentos completo, metas, relatórios, WhatsApp.
  - Pilot: tudo do Plus + prioridades do mês, plano de quitação, otimizador de rolagem, renegociação, grupos de despesa, metas em grupo.
- Preços como placeholders (`R$ XX/mês`).
- Telas de bloqueio elegantes para recursos pagos: mostrar uma prévia real do valor ("Encontramos 3 rotas mais baratas para fechar este mês") antes de pedir a assinatura.

### 6.9 Perfil e configurações

Dados pessoais, segurança (biometria, sessões ativas), privacidade (exportar e apagar todos os dados), notificações, assinatura, ajuda.

## 7. Componentes do design system

- Card de resumo com valor grande, rótulo e variação.
- Barra de progresso de teto com marcador de "ritmo esperado" para o dia atual.
- Card de ação ("o que fazer agora") com ícone, título, custo ou economia e CTA.
- Item de transação e item de conta ou cartão (com logo do banco).
- Chip de categoria com ícone e cor.
- Badge de prioridade: Pagar agora, Parcelar, Negociar/Esperar, Cortar.
- Comparador de rotas (2 ou 3 colunas).
- Linha do tempo (vencimentos, quitação).
- Indicador de fases da jornada (4 etapas).
- Bolhas de chat, card rico dentro do chat, botão de áudio com estado gravando.
- Área de upload de arquivos.
- Estados vazios ilustrados e encorajadores; skeletons de carregamento; mensagens de erro com ação de recuperação.
- Bottom sheet (mobile) e modal ou painel lateral (desktop) para o mesmo conteúdo.

## 8. Dados de exemplo para as telas

Usar uma persona fictícia e números realistas:

- **Persona:** Marcos, 38 anos, renda de R$ 34.000 por mês, compromissos de R$ 46.500 em outubro.
- 4 cartões (Nubank, Itaú, Santander, XP) e 1 cartão manual de um familiar.
- Rotativo de R$ 12.300, empréstimo pessoal de R$ 28.000, parcelamento de impostos da empresa em 48 vezes de R$ 890.
- 11 assinaturas somando R$ 612/mês, incluindo 2 serviços de música em cartões diferentes.
- Teto de Uber: R$ 990 de R$ 1.000 no dia 15.
- Meta: viagem de Réveillon, R$ 5.000 até dezembro.
- Meta em grupo: viagem do casal, R$ 30.000 em 12 meses.

## 9. Acessibilidade

- Contraste WCAG AA em todos os textos, nos modos claro e escuro.
- Cor nunca como único meio de transmitir significado (ícone ou texto junto).
- Suporte a fonte ampliada do sistema sem quebrar layouts.
- Rótulos para leitores de tela em gráficos (resumo textual do dado principal).

## 10. Entregáveis esperados

1. Direção visual: paleta, tipografia, ícones e estilo de ilustração.
2. Design system com os componentes da seção 7 em claro e escuro.
3. Telas mobile (390 px) de todas as seções da seção 6.
4. Telas desktop (1440 px) de Início, Gastos, Prioridades do mês, Otimizador de rolagem, Metas e Assistente.
5. Fluxos completos: onboarding com Open Finance, onboarding com upload, registrar gasto por áudio no chat, cancelar uma assinatura pelo caçador de vazamentos, montar as prioridades do mês.

Prioridade se for preciso escolher: **Início, Prioridades do mês, Caçador de vazamentos, Assistente e Onboarding.**
