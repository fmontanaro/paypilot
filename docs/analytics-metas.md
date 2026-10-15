# Análises da edição de metas

O rastreador é gerenciado e injetado pelo Replit. Não adicionar script, ID de
site nem configuração de analytics ao app.

| Descrição | Nome do evento |
| --- | --- |
| Abertura pelo botão Editar meta | `goal_edit_opened` |
| Cancelamento pelo botão Cancelar, X, Escape ou fundo do painel | `goal_edit_cancelled` |
| Salvamento concluído | `goal_edit_saved` |
| Tentativa bloqueada pela validação ou solicitação com erro | `goal_edit_failed` |

Somente falhas têm uma dimensão: `reason`, com `validation` ou `request`.
Não enviar conteúdo de campos, nomes de metas, IDs, valores, datas, mensagens
de erro ou dados pessoais.

Os eventos contam interações, não metas nem pessoas únicas. Uma mesma abertura
pode ter várias tentativas com falha antes de salvar ou cancelar. Não somar
falhas a cancelamentos para calcular abandono. Sair da página ou fechar a aba
não gera cancelamento; diferenças entre aberturas e sucessos não são uma
contagem exata de abandonos.

A ausência do rastreador e suas falhas síncronas ou assíncronas não interrompem
o formulário. Não há fila local nem reenvio de eventos perdidos.

A coleta só fica disponível na versão publicada com analytics habilitado nas
configurações de Publishing. Esta alteração não publica o projeto.

Perguntas úteis após a coleta:
- Quantas edições foram abertas, salvas ou canceladas no período?
- Houve mais falhas de validação ou de solicitação ao salvar?
