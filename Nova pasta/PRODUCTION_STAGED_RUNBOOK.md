# Runbook de Deploy Modular (Projeto Ciclo, MPV Ciclo, Nexus)

## Objetivo
Separar a operacao em tres camadas:
- `ERP_CORE`: nucleo do Projeto Ciclo
- `MPV_CICLO`: integracao operacional ERP + PDV + pagamentos
- `CEREBRO_NEXUS`: observacao, sinais operacionais e consolidacao da trilha auditavel

## Estado real de producao

Confirmado em `2026-03-06`:
- Projeto: `ciclo-plus-f9c8f`
- `MPV_CICLO` ativo em `https://us-central1-ciclo-plus-f9c8f.cloudfunctions.net/mpvCicloApi`
- `MPV_CICLO /healthz` ativo
- `MPV_CICLO /manifest` ativo
- segredos de ingress ativos no Secret Manager:
  - `MPV_CICLO_SMARTPOS_WEBHOOK_SECRET`
  - `MPV_CICLO_ASAAS_WEBHOOK_SECRET`
  - `MPV_CICLO_ERP_FORWARD_SECRET`
- `nexusObserveAuditLog` publicado em producao
- `Nexus` materializando sinais em `tenants/{tenantId}/nexusSignals`
- `Nexus` consolidando resumo em `monitoring/nexus/tenants/{tenantId}`
- `compute.googleapis.com` habilitada para suportar a trigger Firestore 2nd gen do `Nexus`

## Fluxo fim a fim validado em producao

1. `ERP_FORWARD -> PLACE_ORDER`
2. `SMARTPOS_WEBHOOK -> RESERVE_STOCK`
3. `ASAAS_WEBHOOK -> SIGN_CONTRACT + CREATE_ESCROW`
4. `SMARTPOS_WEBHOOK -> CONFIRM_DISPATCH`
5. `SMARTPOS_WEBHOOK -> CONFIRM_DELIVERY`
6. `ERP_FORWARD -> RELEASE_SETTLEMENT`
7. `Nexus -> observacao de ORDER_PLACED, STOCK_RESERVED, CONTRACT_SIGNED, ESCROW_CREATED, DISPATCH_CONFIRMED, DELIVERY_CONFIRMED e SPLIT_RELEASED`

## Etapas de execucao

### Etapa 1 - Pre-validacao de arquitetura
- `npm run verify:portal-channelization`
- `npm run verify:production-env`

### Etapa 2 - Pre-flight local
- `npm run go-live:preflight`
- `npm run typecheck`
- `npm run build`

### Etapa 3 - Deploy de seguranca
- `npm run firebase:deploy:rules`
- `npm run firebase:deploy:functions`

### Etapa 4 - Pos-deploy e estabilizacao
- `npm run go-live:smoke`
- `npm run go-live:monitor:snapshot`
- `npm run go-live:status`
- `npm run go-live:report`
- verificar `tenants/{tenantId}/mpvIngress`
- verificar `tenants/{tenantId}/auditLogs`
- verificar `tenants/{tenantId}/nexusSignals`
- consultar `GET /v1/support/nexus/signals?limit=25` com perfil `Gestor`, `Administrador` ou `Integradora`

### Etapa 5 - Fechamento operacional
- confirmar `SUPPORT_MODULE_MPV_CICLO_BASE_URL=https://us-central1-ciclo-plus-f9c8f.cloudfunctions.net/mpvCicloApi`
- confirmar que o pipeline usa a mesma URL em `Variables/Environment`
- confirmar que `compute.googleapis.com` permanece `ENABLED`
- confirmar que novos fluxos geram `auditLogs`, `mpvIngress`, `nexusSignals` e `monitoring/nexus/tenants/{tenantId}`
- tratar como regressao qualquer fluxo que chegue a `RECEIVED` sem materializar `MPV_CORE_ACTION_PROCESSED`

## Contrato de variaveis criticas

No minimo:
- `VITE_FIREBASE_*`
- `FIREBASE_PROJECT_ID`
- `SETTLEMENT_PROVIDER=FIRESTORE_LEDGER`
- `SUPPORT_MODULE_ERP_CORE_BASE_URL` (opcional; endpoint do nucleo para health/manifest)
- `SUPPORT_MODULE_ERP_CORE_MANIFEST_PATH` (padrao `/v1/support/manifest`)
- `SUPPORT_MODULE_MPV_CICLO_BASE_URL` (obrigatorio)
- `SUPPORT_MODULE_MPV_CICLO_ENABLED=true`
- `SUPPORT_MODULE_MPV_CICLO_HEALTH_PATH=/healthz`
- `SUPPORT_MODULE_MPV_CICLO_MANIFEST_PATH=/manifest`
- `SUPPORT_MODULE_CEREBRO_NEXUS_ENABLED` (opcional; a observacao interna pode operar mesmo sem gateway externo)
- `SUPPORT_MODULE_NEXUS_GATEWAY_URL` (opcional para fallback de health/manifest)

## Diagnostico rapido

- Se `go-live:smoke` falhar, corrigir primeiro:
  - `SUPPORT_MODULE_MPV_CICLO_*`
  - `SUPPORT_MODULE_CEREBRO_NEXUS_*`
  - `SUPPORT_MODULE_NEXUS_GATEWAY_URL`
- Se a criacao do `nexusObserveAuditLog` falhar com Eventarc:
  - conferir `compute.googleapis.com`
  - aguardar propagacao do service agent do Eventarc
  - repetir o deploy isolado da function
- Se o `MPV_CICLO` responder `401`, o endpoint esta seguro e o segredo enviado esta incorreto ou ausente
- Se o fluxo parar em `MANUAL_REVIEW_REQUIRED`, enriquecer payload contratual, evidencias ou identidade canonica do pedido
