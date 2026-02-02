# Security / Escopo – checklist rápido (Sprint 4.2.2)

1) Supplier scope
- Login como supplier A.
- Chamar `GET /stock-balances?supplierId=supplierB` → esperar 403.
- Chamar `GET /stock-movements?supplierId=supplierB` → esperar 403.

2) Catálogo publicado
- Cliente chama `POST /requests` com `catalogItemId` de item `published=false` → esperar 403/400.
- Cliente lista `GET /catalog?published=true` → não deve retornar itens unpublished.

3) Tenant isolation
- Admin de tenant X tenta `POST /catalog` com `supplierId` de outro tenant → esperar 403.
- Supplier tenta `POST /supplier-items` com `supplierId` diferente do seu uid → 403.

4) Fluxo estoque por fornecedor
- Supplier lança IN em item dele, saldo `available` aumenta.
- Cliente cria request usando catálogo; Admin aprova → movimento RESERVE no fornecedor correto.
- Admin muda para DELIVERED → OUT registrado e saldo disponível reduz.

Executar sempre em staging ou ambiente com dados de teste. Guardar evidências (status HTTP e corpo).*** End Patch ***!
