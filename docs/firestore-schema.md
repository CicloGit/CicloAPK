# Firestore — Esquema Proposto (stub)

## Campos comuns
- `tenantId` (string, obrigatório) — todas as coleções.
- `createdAt` / `updatedAt` — timestamps.
- `createdBy` (uid) — quem criou.

## Coleções
### tenants
- `name`, `logoUrl`, `taxId`, `billingProvider` (`asaas`), `asaasCustomerId`.
- `plan`, `status` (`active|suspended`), `settings` (json).

### users
- `uid` (doc id), `email`, `displayName`, `role`, `tenantId`, `permissions[]`, `phone`.
- `active` (bool), `inviteStatus` (`pending|accepted|revoked`).

### suppliers
- `name`, `contact`, `channels` (email/whatsapp), `items[]` (ids ou refs), `slaHours`.
- `enabledTenants[]` (apenas se multi-tenant compartilhado) — preferir duplicar por tenant para isolamento.

### inventory
- `itemId`, `name`, `category`, `unit`, `minStock`.
- `stockByLocation[]` { `locationId`, `quantity` }.
- Movimentações em subcoleção `inventory/{itemId}/moves` com `type` (`in|out`), `quantity`, `reason`, `tenantId`.

### requests
- Solicitações de clientes.
- Campos: `clientId`, `items[] { itemId, qty }`, `status` (`pending|approved|fulfillment|done|canceled`), `assignedSupplierId?`, `assignedTechId?`.

### opportunities / visits
- `opportunities`: `propertyId`, `summary`, `status`, `ownerId`, `techId`.
- Subcoleção `visits`: `scheduleAt`, `notes`, `attachments`, `nextActions`.

## Índices recomendados (exemplos)
- `users`: `tenantId + role`, `tenantId + inviteStatus`.
- `inventory`: `tenantId + category`, `tenantId + stockByLocation.locationId`.
- `requests`: `tenantId + status`, `tenantId + clientId`.
- `opportunities`: `tenantId + techId + status`.

## Regras de segurança (alto nível)
- `request.auth.token.tenantId == resource.data.tenantId`.
- `allow read, write` apenas se `request.auth.token.role` tiver permissão declarada (matriz em `docs/rbac-matrix.md`).
- Preferir regras por coleção, com checks explícitos de role + tenant.
