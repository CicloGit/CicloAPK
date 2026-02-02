# RBAC — Ciclo+ (versão inicial)

| Ação / Módulo                    | Owner | Admin | Técnico | Cliente | Fornecedor |
|----------------------------------|:-----:|:-----:|:-------:|:-------:|:----------:|
| Criar/editar usuários do tenant  |  ✅   |  ❌   |   ❌    |   ❌    |     ❌     |
| Gerir fornecedores               |  ✅   |  ✅   |   ❌    |   ❌    |     ❌     |
| Configurar integrações (Asaas)   |  ✅   |  ❌   |   ❌    |   ❌    |     ❌     |
| Estoque: cadastro/movimentação   |  ✅   |  ✅   |   ❌    |   ❌    |     ❌     |
| Aprovar/gerir solicitações       |  ✅   |  ✅   |   ❌    |   ❌    |     ❌     |
| Visitas / oportunidades          |  ✅   |  ✅   |   ✅    |   ❌    |     ❌     |
| Solicitar insumos                |  ✅   |  ✅   |   ✅    |   ✅    |     ❌     |
| Visualizar financeiro do tenant  |  ✅   |  ✅   |   ❌    |   ❌    |     ❌     |
| Visualizar financeiro próprio    |  ✅   |  ✅   |   ✅    |   ✅    |     ❌     |
| Confirmar reposição/entrega      |  ✅   |  ✅   |   ✅    |   ❌    |     ✅     |

Notas:
- `Owner` é superusuário do tenant; Admin não cria/remover usuários.
- `Fornecedor` é opcional e acessa somente entregas/reposição quando habilitado pelo Owner.
- Regras refletem o que deve ir para claims `role` + `permissions` e regras do Firestore.
