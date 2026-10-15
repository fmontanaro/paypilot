# PayPilot

Copiloto financeiro para quem tem renda, mas fecha o mês no vermelho. Junta contas e cartões, mostra para onde o dinheiro vai, decide com o usuário o que pagar primeiro e traça um plano mês a mês até sobrar dinheiro.

Não é banco, não vende crédito e nunca recomenda investimento. A receita vem só de assinatura (Grátis, Plus e Pilot).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [docs/produto.md](docs/produto.md) | Plano completo do produto: visão, módulos, planos, regulação, roadmap e métricas. **Fonte da verdade.** |
| [docs/arquitetura.md](docs/arquitetura.md) | Stack, pastas, fluxo de dados, API, modelo de dados, segurança e variáveis de ambiente. |
| [docs/motor-financeiro.md](docs/motor-financeiro.md) | Regras escritas de cada cálculo (priorização, rolagem, quitação, tetos, vazamentos…). |
| [docs/roadmap.md](docs/roadmap.md) | Status de cada módulo e o que falta por etapa. |
| [design_guidelines.md](design_guidelines.md) | Design system: tokens, tipografia, layout responsivo e componentes. |
| [design_handoff_paypilot/](design_handoff_paypilot/README.md) | Protótipos HTML de alta fidelidade de todas as telas (referência visual). |

## Rodar localmente

Requer Node.js 20 ou mais novo.

```bash
npm install
npm run dev        # http://localhost:5000
```

Sem `DATABASE_URL`, o servidor usa um Postgres embutido (PGlite) em `.data/`. Na tela de boas-vindas, **Já tenho conta → Entrar com a conta de demonstração** cria a persona Marcos com todos os dados de exemplo do handoff.

Outros comandos:

```bash
npm test           # testes do motor financeiro e dos leitores de arquivo
npm run check      # verificação de tipos
npm run build      # build de produção (cliente + servidor)
npm start          # roda o build
npm run db:generate  # gera migração a partir de shared/schema.ts
```

As variáveis de ambiente opcionais (IA, WhatsApp, banco) estão em [docs/arquitetura.md](docs/arquitetura.md#variáveis-de-ambiente).

## Regra de ouro

Todo número que o usuário vê sai do motor financeiro (`shared/engine/`), que é determinístico e testado. A IA só entende o pedido e explica o resultado.
