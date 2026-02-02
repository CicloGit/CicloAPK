# Ciclo+ — Arquitetura Inicial (28/01/2026)

## Visão Geral
- Multi-tenant por `tenantId` em todas as coleções/subcoleções do Firestore.
- Autenticação via Firebase Auth (tokens com claims `role`, `tenantId`).
- API NestJS (Railway) com guards: `FirebaseAuthGuard`, `RolesGuard`, `TenantGuard`.
- App Expo (React Native) com navegação baseada em papel; contexto global (`AuthContext`) armazena `role` e `tenantId`.

## Backend
- **Config**: `@nestjs/config` global; `.env.example` listado na raiz do backend.
- **Módulos criados**:
  - `AuthModule`: rota `GET /api/auth/me` devolve perfil autenticado; usa Firebase Admin.
  - `TenantsModule`: rotas stub `GET /api/tenants/current` e `POST /api/tenants/users` (Owner).
- **Guards**:
  - `FirebaseAuthGuard`: valida bearer token, aplica claims no `request.user`.
  - `RolesGuard`: valida metadados `@Roles`.
  - `TenantGuard`: garante header `x-tenant-id` compatível com `request.user.tenantId`.
- **Próximos**: serviços Firestore, filas de provisionamento de usuários, integrações Asaas (webhooks).

## Frontend
- Expo + React Navigation (native-stack).
- `AuthContext`: mantém sessão em memória; `signInAs` usado como mock até integrar Firebase/Auth SDK.
- `RootNavigator`: direciona stacks por role (owner/admin/technician/client|supplier) ou tela de autenticação.
- Telas stub por papel destacam responsabilidades (estoque, financeiro, campo, solicitações).

## Fluxo de autenticação alvo
1) App usa Firebase Auth (email/senha ou SSO).
2) Token JWT traz `role` + `tenantId` via custom claims.
3) API recebe bearer, `FirebaseAuthGuard` valida e injeta `request.user`.
4) `TenantGuard` bloqueia discrepância de `tenantId` (header vs claim).
5) Controllers executam lógica de tenant isolado.

## Multi-tenant no Firestore (princípio)
- Coleções de topo segregadas por `tenantId` em campo obrigatório:
  - `tenants` (metadados, billing, integrações)
  - `users` (perfil + role + `tenantId`)
  - `suppliers`
  - `inventory` (insumos, estoque)
  - `requests` (solicitações de clientes)
  - `opportunities` / `visits`
- Índices compostos planejados (ver `docs/firestore-schema.md`).
