# Motor financeiro

Regras escritas de todos os cálculos do PayPilot. O código fica em `shared/engine/` e cada regra tem teste em `shared/engine/__tests__/`. Se uma regra mudar, mude aqui, no código e no teste ao mesmo tempo.

Princípios (da spec):

- **Custo à vista.** Toda sugestão diz quanto custa em juros, multa ou risco de negativação.
- **Determinístico.** Os mesmos dados geram sempre os mesmos números. A IA não calcula nada.
- **Nunca incentiva rolar dívida.** Toda rota de rolagem mostra o custo e aponta a saída (plano de quitação).
- **Nunca recomenda investimento.** O motor gera a sobra; o destino dela é do usuário.

Valores em reais, taxas em % ao mês. Arredondamento só na exibição (`shared/format.ts`).

## Matemática básica (`finance.ts`)

- **Parcela (PMT):** `P = V × i / (1 − (1 + i)^−n)`; com `i = 0`, `P = V / n`.
- **Custo de parcelar:** `n × P − V`.
- **Juros de um mês sobre um saldo:** `saldo × i`.
- **Dias entre datas:** diferença de calendário em dias inteiros.

## Resumo do mês (`month.ts`)

- **Renda prevista:** soma das rendas recorrentes do mês.
- **Previsto:** soma de todos os compromissos do mês como se tudo fosse pago à vista.
- **A pagar no mês:** soma do impacto de cada compromisso conforme a seção escolhida (ver Priorização).
- **Saldo:** renda − a pagar. Positivo: "Cabe: sobram X". Negativo: "Faltam X".
- **Buraco no dia 1º:** previsto − renda (quando positivo). **Já coberto:** previsto − a pagar.
- **Progresso do mês:** dia de hoje ÷ dias do mês.

## Motor de priorização (`priorities.ts`)

Cada compromisso do mês vai para uma de quatro seções.

| Seção | Quando é permitida | Entra no mês | Custo |
| --- | --- | --- | --- |
| Pagar agora | sempre (itens já pagos ficam fixos aqui) | valor cheio | 0 |
| Parcelar | compromisso com opção de parcelamento (fatura de cartão com taxa de parcelamento) | 1 parcela (PMT) | `n × P − V` |
| Negociar ou esperar | compromisso que pode ser adiado | 0 | custo de adiar (abaixo) |
| Cortar | compromisso marcado como cortável (supérfluo) | 0 | 0, vira economia |

**Custo de adiar um mês:**

- Fatura de cartão: `V × taxa do rotativo + 2% de multa`. Risco: "Entra no rotativo de X% ao mês".
- Conta com multa: `V × (2% multa + 1% juros de mora)`.
- Dívida com pessoa, cartão de familiar ou conta com aviso prévio: 0, com a observação do combinado.
- Quando o compromisso tem custo informado (`delayCost`), vale o informado.

**Riscos mostrados** (texto fixo por tipo): pode negativar seu nome · atraso acima de 60 dias pode suspender o plano · atrasar 3 parcelas cancela o parcelamento · entra no rotativo de X% ao mês.

**Sugestões para cobrir o buraco** (máx. 3, só itens que estão em "Pagar agora"):

- Candidatos: adiamentos combinados sem custo (dívida com pessoa, cartão de familiar) e parcelamentos de fatura.
- Ordem: do menor custo por real aliviado para o maior (os sem custo vêm primeiro); empate, maior alívio primeiro.
- Nunca sugere adiar algo com custo ou risco de negativação, nem cortar item essencial.

O título da sugestão sai do tipo do item ("Parcelar a fatura Itaú em 6x", "Combinar com a Helena para novembro") e a linha de baixo mostra o alívio no mês e o custo.

## Tetos por categoria (`ceilings.ts`)

- **Gasto:** soma das transações da categoria no mês até hoje.
- **Ritmo esperado:** dia de hoje ÷ dias do mês (o marcador na barra).
- **Projeção:** `gasto ÷ dia de hoje × dias do mês`. Categorias fixas (assinaturas, moradia…) são cobradas uma vez no mês e não são projetadas: projeção = gasto.
- **Status:** "No limite" se gasto ≥ 90% do teto; "Acima do ritmo" se projeção > teto; senão "No ritmo".
- **Tetos em risco** (Início): os de maior % usado entre os que estão no limite ou acima do ritmo, até 3.

## Categorização (`categorize.ts`)

1. Regras do usuário (`category_rules`), da mais nova para a mais antiga: se a descrição contém o padrão, usa a categoria e o grupo da regra.
2. Dicionário padrão por palavra-chave (Uber → Transporte, iFood → Restaurantes, DARF → Minha empresa, Tarifa → Juros e tarifas…).
3. Sem correspondência: "Compras".

Cada categoria já sabe se é fixa ou variável e essencial ou supérflua (`shared/categories.ts`). Ao corrigir uma categoria com "Criar regra para casos parecidos", nasce uma regra do usuário.

## Caçador de vazamentos (`leaks.ts`)

Olha os últimos 90 dias de transações.

| Tipo | Regra |
| --- | --- |
| Assinatura | mesmo estabelecimento em pelo menos 2 meses diferentes, valor dentro de ±15%, ou categoria Assinaturas |
| Serviço repetido | duas assinaturas da mesma família (música ou armazenamento na nuvem) em contas diferentes; a mais cara vira vazamento |
| Aumento de preço | alguma cobrança do período veio mais de 10% acima da anterior |
| Tarifa e anuidade | descrição com tarifa, cesta, pacote de serviços ou anuidade |
| Seguro embutido | descrição com seguro |
| Cobrança duplicada | mesma conta, mesma descrição, mesmo valor, mesmo dia |
| Sem uso | assinatura marcada "Não usei" no check-in |

- **Desperdício por mês:** soma dos vazamentos abertos recorrentes (duplicadas contam à parte, "uma vez").
- **Recuperado:** soma dos cancelados.
- As decisões do usuário (ainda uso, ignorar, cancelado) nunca são sobrescritas por uma nova detecção.
- O passo a passo de cancelamento sai do tipo (assinatura, tarifa, seguro, duplicada).

## Otimizador de rolagem (`rollover.ts`)

Para uma fatura a pagar, compara até 3 rotas com o crédito atual:

| Rota | Custo | Fôlego | Próximo mês | Aviso |
| --- | --- | --- | --- | --- |
| A · Parcelar a fatura | `n × P − V` | `n × 30` dias, em parcelas | `+P` | custo previsível, termina no mês X |
| B · Pagar com o limite de outro cartão | 0 agora | dias até o vencimento da fatura em que a compra cai | `+V` | se não pagar inteira, vira rotativo de X% |
| C · Cheque especial até a renda cair | `V × taxa ÷ 30 × dias` | dias até a próxima renda | `+V + custo` | caro e curto |

- A rota B só aparece se outro cartão tiver limite livre ≥ V; escolhe o de maior fôlego.
- A rota C só aparece se houver cheque especial com limite livre ≥ V.
- **"Mais barata com saída"**: a de menor custo entre as que terminam a dívida num prazo definido (parcelamento). A rota B nunca recebe o selo, porque só empurra a conta.
- **Custo da rolagem do mês:** soma das transações de Juros e tarifas do mês; tendência = variação contra o mês anterior, histórico de 6 meses.

## Plano de quitação (`payoff.ts`)

- **Dívidas:** contas com saldo que cobra juros (rotativo, cheque especial, empréstimo) e dívidas pessoais.
- **Pagamento mínimo:** cartão 15% do saldo inicial; cheque especial, os juros do mês + 10% do saldo inicial; empréstimo, a parcela; dívida pessoal, o valor combinado.
- **Valor mensal para dívidas:** preferência do usuário; sem ela, a soma dos mínimos. Nunca menos que a soma dos mínimos.
- **Só o mínimo (comparação):** cada dívida recebe apenas o próprio mínimo, sem direcionar a sobra.
- **Simulação (avalanche):** a cada mês aplica juros, paga os mínimos e manda o que sobra para a dívida de maior taxa. Dívidas sem juros seguem o combinado.
- **Saídas:** data de quitação e juros pagos por dívida, juros totais, data "livre das dívidas" e economia contra pagar só o mínimo.
- **Fases da jornada:** 1 · Fechar o mês (enquanto o mês atual não cabe) → 2 · Estabilizar (o mês cabe, mas ainda há custo de rolagem: parcelar ou adiar com juros, juros de rotativo/cheque no mês) → 3 · Quitar (até a última dívida) → 4 · Gerar sobra (sem dívidas).

## Simulador de renegociação (`renegotiation.ts`)

| Tipo de dívida | Faixa sugerida à vista | Taxa de referência |
| --- | --- | --- |
| Rotativo de cartão | 60% a 70% do saldo | 2,9% a.m. |
| Cheque especial | 85% a 94% do saldo | 2,5% a.m. |
| Empréstimo pessoal | 87,5% a 93% do saldo | 2,4% a.m. |

- Parcela "depois": PMT do saldo na taxa de referência, de 6 a 36 meses.
- "Antes": rotativo = mínimo de 15% sem fim definido; cheque = só juros; empréstimo = parcela atual × parcelas restantes.
- O script para o banco sai pronto para copiar. O PayPilot não indica banco nem vende crédito.

## Metas (`goals.ts`)

- **Início e prazo:** o mês de início é preservado na edição. O mês final é inclusivo: uma meta de janeiro a março tem três contribuições. Um prazo alterado deve ir do mês atual em diante, entre 1 e 120 meses desde o início original. O prazo original pode ser mantido mesmo vencido ao editar os outros detalhes.
- **Esforço restante:** divide o que falta guardar pelos meses entre o maior de início/mês atual e o mês final, incluindo ambos. Metas vencidas usam pelo menos um mês; objetivos já atingidos têm esforço zero.
- **Edição:** nome, ícone, objetivo e prazo não alteram os valores já guardados, os saldos dos participantes nem registros anteriores. Reduzir o objetivo abaixo do guardado é permitido.

- **Valor mensal:** (valor − já guardado) ÷ meses.
- **De onde tirar:** assinaturas sem uso abertas no caçador; e para cada teto supérfluo (restaurantes, compras, lazer), baixar `⌊teto ÷ 6 ÷ 100⌋ × 100`.
- **Trade-off:** o que faltar sai do valor mensal para dívidas; o motor refaz a quitação com esse valor a menos durante o prazo da meta e mostra quantos meses a dívida mais cara atrasa.
- **Meta em grupo:** divisão igual ou proporcional à renda informada (a renda de um nunca aparece para o outro).

## "Posso gastar?" (`affordability.ts`)

Para um valor e uma categoria:

- **Mês:** o saldo do mês piora no valor.
- **Teto:** quanto estoura (gasto + valor − teto) e o **valor seguro** (teto − gasto).
- **Plano:** atraso da dívida mais cara em dias = valor ÷ (pagamento mensal dela ÷ 30).

## Início (`home.ts`)

- **O que fazer agora** (máx. 3, nesta ordem): compromisso não pago que vence em até 3 dias com risco → economia possível no caçador → teto no limite antes do fim do mês.
- **Próximos vencimentos:** compromissos não pagos e fechamentos de cartão nos próximos 14 dias.
- **Progresso do plano:** fase atual, dívida total e variação contra o mês anterior (tabela `snapshots`), data prevista de quitação e quanto ela adiantou.
