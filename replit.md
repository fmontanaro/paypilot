# PayPilot

Copiloto financeiro para quem tem renda, mas fecha o mês no vermelho: junta contas e cartões, mostra para onde vai o dinheiro, decide com o usuário o que pagar primeiro e traça a saída das dívidas. Não é banco, não vende crédito, não recomenda investimentos. Receita só por assinatura (Grátis / Plus / Pilot).

## Leia antes de mudar qualquer coisa

1. [docs/produto.md](docs/produto.md) — especificação completa do produto (fonte da verdade).
2. [docs/arquitetura.md](docs/arquitetura.md) — stack, pastas, API e modelo de dados.
3. [docs/motor-financeiro.md](docs/motor-financeiro.md) — regras de cálculo.
4. [design_guidelines.md](design_guidelines.md) e `design_handoff_paypilot/` — design de alta fidelidade.
5. [docs/roadmap.md](docs/roadmap.md) — o que está pronto e o que falta.

## Regras do projeto

- Todo número sai do motor financeiro em `shared/engine/` (funções puras, com testes). A IA nunca calcula valores.
- O assistente responde só sobre as finanças do usuário e recusa conversa geral (política do WhatsApp).
- Nada de citar produto, ativo ou instituição para investir.
- Toda consulta ao banco filtra pelo usuário da sessão.
- Telas seguem o handoff à risca: tokens de `client/src/styles.css`, componentes de `client/src/ui/`.
- Textos em português do Brasil, moeda `R$ 1.234,56`, datas `14 out`.

## Preferências do usuário

Comunicação simples, em linguagem do dia a dia.

## Rodar

`npm run dev` (porta 5000). Sem `DATABASE_URL`, usa PGlite em `.data/`. Testes: `npm test`.
