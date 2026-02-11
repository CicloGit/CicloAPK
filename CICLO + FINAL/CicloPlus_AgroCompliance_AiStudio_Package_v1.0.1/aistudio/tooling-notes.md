# Uso no AI Studio (Ferramentas por OpenAPI)

1. Abra o AI Studio e adicione uma ferramenta do tipo OpenAPI.
2. Cole o conteúdo do arquivo:
   - `openapi/agro-compliance-openapi.yaml`
3. Configure a URL do servidor:
   - Desenvolvimento: `http://localhost:3000`
   - Produção: sua URL pública do serviço.

Sugestão de políticas para o agente:
- Sempre chamar `/lotes/{loteId}/gate` antes de permitir:
  - alimentação
  - medicamentos
  - transferência
  - emissão de Nota Fiscal

- Para mudar estágio:
  - chamar primeiro o ciclo (status e conferência)
  - confirmar inventário concluído para `ENGORDA -> PRONTO_VENDA`
  - exigir evidências conforme a transição

Observação:
- Este pacote já inclui um servidor base em `src/server.ts` que implementa endpoints mínimos para testes.
