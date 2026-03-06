# Ciclo+ ERP Web

Sistema web ERP para operacao agro com foco em cadastro de propriedade, estoque auditavel, modulos produtivos e dashboards por perfil.

## Stack atual

- Frontend: React 18 + TypeScript + Vite + Tailwind
- Backend/Dados: Firebase (Auth, Firestore, Storage)
- Regras de negocio cliente: `lib/` + `services/`

## Como rodar local

### 1) Instalar dependencias

```bash
npm install
```

### 2) Configurar variaveis de ambiente

Crie `/.env.local` usando `/.env.example`.

Para emuladores locais (recomendado no inicio):

```env
VITE_FIREBASE_API_KEY=local-dev-api-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=ciclo-plus-local
VITE_FIREBASE_STORAGE_BUCKET=ciclo-plus-local.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:local
VITE_USE_FIREBASE_EMULATORS=true
VITE_AUTH_EMULATOR_HOST=127.0.0.1:9099
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
VITE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

### 3) Iniciar emuladores Firebase

```bash
npm run emulators:start
```

### 4) Iniciar frontend

```bash
npm run dev
```

### 5) Validar build

```bash
npm run build
```

## Scripts principais

- `npm run dev`: sobe frontend em desenvolvimento
- `npm run build`: valida TypeScript e gera build de producao
- `npm run typecheck`: apenas validacao TypeScript
- `npm run emulators:start`: sobe Auth + Firestore + Storage + UI local
- `npm run firebase:deploy:rules`: publica regras/indexes no Firebase
- `node ../scripts/verify-firebase-real-mode.mjs`: auditoria de modo real (bloqueia mocks em deploy de producao)
- `npm run verify:production-env`: valida variaveis obrigatorias de producao e guardas de deploy
- `npm run verify:portal-channelization`: valida isolamento de perfis por portal para operação multi-tenant
- `npm run go-live:smoke`: smoke funcional de producao (hosting + APIs principais)
- `npm run go-live:monitor:snapshot`: snapshot de monitoramento 48h (latencia + status + log JSONL/MD)
- `npm run go-live:status`: resumo da janela 48h (progresso, snapshots esperados e pendencias)
- `npm run go-live:report`: gera `GO_LIVE_48H_STABILITY_REPORT.md` com consolidado tecnico
- `npm run go-live:watch-48h`: executa monitoramento automatico pela janela completa
- `npm run go-live:watch-48h:once`: executa um ciclo automatico (snapshot + status + report)

## Arquitetura operacional (escala)

Estrutura alvo para producao:

- `SUPPORT_MODULE_ERP_CORE`: Nucleo do Projeto Ciclo (consolidação do legado) como contrato base.
- `SUPPORT_MODULE_MPV_CICLO`: módulo externo de integração ERP + PDV.
- `SUPPORT_MODULE_CEREBRO_NEXUS`: motor cognitivo de governança/evidências/assinatura.

Fluxo:
1. `Projeto Ciclo` mantém os dados operacionais (Firestore/Collections e regras de segurança).
2. `MPV Ciclo` trata orquestração transacional entre ERP e PDV.
3. `Cerebro NEXUS` observa `tenants/{tenantId}/auditLogs`, materializa sinais em `tenants/{tenantId}/nexusSignals` e consolida snapshot em `monitoring/nexus/tenants/{tenantId}`.
4. A tela `Modulos Reais` controla runtime/health/manifest dos três domínios com persistência por tenant.

Endpoint operacional desta etapa:

- `GET /v1/support/nexus/signals?limit=25` retorna `summary` + últimos sinais observados pelo `Nexus` para o tenant autenticado.

### Estado real de producao validado em 2026-03-06

- Projeto Firebase: `ciclo-plus-f9c8f`
- `MPV_CICLO` publicado em `https://us-central1-ciclo-plus-f9c8f.cloudfunctions.net/mpvCicloApi`
- Health do `MPV_CICLO`: `https://us-central1-ciclo-plus-f9c8f.cloudfunctions.net/mpvCicloApi/healthz`
- Manifest do `MPV_CICLO`: `https://us-central1-ciclo-plus-f9c8f.cloudfunctions.net/mpvCicloApi/manifest`
- Ingressos seguros ativos via Secret Manager:
  - `POST /v1/webhooks/smartpos`
  - `POST /v1/webhooks/asaas`
  - `POST /v1/erp/forward`
- Observador interno do `Nexus` publicado:
  - function `nexusObserveAuditLog`
  - materializacao em `tenants/{tenantId}/nexusSignals`
  - resumo em `monitoring/nexus/tenants/{tenantId}`
- Pre-requisito de infraestrutura habilitado para o `Nexus`: `compute.googleapis.com`

Fluxo fim a fim ja validado em producao:
1. `ERP_FORWARD -> PLACE_ORDER`
2. `SMARTPOS_WEBHOOK -> RESERVE_STOCK`
3. `ASAAS_WEBHOOK -> SIGN_CONTRACT + CREATE_ESCROW`
4. `SMARTPOS_WEBHOOK -> CONFIRM_DISPATCH`
5. `SMARTPOS_WEBHOOK -> CONFIRM_DELIVERY`
6. `ERP_FORWARD -> RELEASE_SETTLEMENT`
7. `Nexus -> observacao de ORDER_PLACED, STOCK_RESERVED, CONTRACT_SIGNED, ESCROW_CREATED, DISPATCH_CONFIRMED, DELIVERY_CONFIRMED e SPLIT_RELEASED`

Checklist mínimo de variáveis:

- `SUPPORT_MODULE_MPV_CICLO_BASE_URL` (obrigatório em producao)
- `SUPPORT_MODULE_MPV_CICLO_ENABLED=true`
- `SUPPORT_MODULE_MPV_CICLO_HEALTH_PATH` (recomendado `/healthz`)
- `SUPPORT_MODULE_MPV_CICLO_MANIFEST_PATH` (recomendado `/manifest`)
- `SUPPORT_MODULE_ERP_CORE_BASE_URL` (opcional, para expor manifest do núcleo em produção)
- `SUPPORT_MODULE_ERP_CORE_MANIFEST_PATH` (padrão `/v1/support/manifest`)
- `SUPPORT_MODULE_CEREBRO_NEXUS_ENABLED` (sugerido `false` até ativacao)
- `SUPPORT_MODULE_CEREBRO_NEXUS_BASE_URL` (somente se ativo)
- `SUPPORT_MODULE_NEXUS_GATEWAY_URL` (opcional para fallback de health/manifest)
- `SETTLEMENT_PROVIDER=FIRESTORE_LEDGER`

### Fase de implantação modular (etapas)

- Fase 0 (infra):
  - Definir `SUPPORT_MODULE_MPV_CICLO_*` e `SUPPORT_MODULE_CEREBRO_NEXUS_*` em `Settings > Variables` do repositório/Evironment.
  - Garantir `SETTLEMENT_PROVIDER=FIRESTORE_LEDGER`.
- Fase 1 (validação local):
  - `npm run verify:portal-channelization`
  - `npm run verify:production-env`
  - `npm run go-live:preflight`
- Fase 2 (deploy):
  - `npm run firebase:deploy:rules`
  - `npm run firebase:deploy:functions`
  - Pipeline de produção (já roda `verify-production-env`, build e smoke completo)
- Fase 3 (pós-deploy):
  - `npm run go-live:smoke`
  - `npm run go-live:monitor:snapshot`
  - `npm run go-live:status`
  - Conferir se novos eventos estão entrando em `tenants/{tenantId}/nexusSignals`
- Fase 4 (runbook consolidado): `Nova pasta/PRODUCTION_STAGED_RUNBOOK.md`

### Observacoes operacionais de producao

- `SUPPORT_MODULE_MPV_CICLO_BASE_URL` deve apontar para `https://us-central1-ciclo-plus-f9c8f.cloudfunctions.net/mpvCicloApi`
- os segredos de ingress do `MPV_CICLO` estao no Secret Manager, nao no `.env` de producao
- o observador do `Nexus` depende de trigger Firestore 2nd gen; se o deploy falhar com Eventarc, conferir primeiro `compute.googleapis.com`
- a camada de observacao do `Nexus` ja esta ativa mesmo sem expor um gateway externo dedicado para `CEREBRO_NEXUS`

## Estrutura principal

- `App.tsx`: roteamento principal e guards de autenticacao/autorizacao
- `config/firebase.ts`: inicializacao Firebase + conexao opcional com emuladores
- `contexts/AppContext.tsx`: sessao, login, registro e perfil de usuario
- `services/propertyService.ts`: persistencia de propriedade/pastos/projetos
- `services/stockService.ts`: persistencia de inventario/movimentos/auditoria
- `services/financialService.ts`: persistencia de contas/recebiveis/despesas/transacoes
- `services/salesService.ts`: persistencia de ofertas de venda
- `services/workforceService.ts`: persistencia de equipe/ponto/folha/epis
- `services/reportsService.ts`: persistencia de relatorios e indicadores
- `services/carbonService.ts`: persistencia de carbono (praticas, projetos, creditos)
- `services/publicMarketService.ts`: persistencia de mercado publico (tendencias, estatisticas, noticias, leiloes)
- `services/aiAnalysisService.ts`: persistencia de analises de IA (resultados e historico)
- `services/operationalActionService.ts`: persistencia de acoes operacionais
- `services/customInputService.ts`: persistencia de solicitacoes e formulas de insumos
- `services/systemConfigService.ts`: persistencia das configuracoes do sistema
- `services/dataDictionaryService.ts`: persistencia do dicionario de dados
- `services/operationsTableService.ts`: persistencia da tabela de operacoes
- `services/eventsMatrixService.ts`: persistencia da matriz de eventos
- `services/liquidationFlowsService.ts`: persistencia dos fluxos de liquidacao
- `services/architectureService.ts`: persistencia da arquitetura do sistema
- `services/legalService.ts`: persistencia do modulo juridico (contratos, licencas, compliance)
- `services/operatorService.ts`: persistencia do portal do operador (tarefas, solicitacoes)
- `services/integrationsService.ts`: persistencia do hub de integracoes (status e solicitacoes)
- `services/supplierService.ts`: persistencia do fornecedor (pedidos e financeiro)
- `services/integratorService.ts`: persistencia da integradora (rede, ofertas, mensagens)
- `services/producerDashboardService.ts`: persistencia do dashboard do produtor (indicadores e detalhes)
- `services/technicianService.ts`: persistencia do tecnico (kpis e relatorios)
- `services/seedProducerService.ts`: persistencia do produtor de sementes (campos, lotes, certificacao)
- `services/investorService.ts`: persistencia do investidor (kpis e projetos)
- `services/managerService.ts`: persistencia do gestor (kpis e atividades)
- `services/managementService.ts`: persistencia de alertas e historico de manejo
- `services/futureMarketService.ts`: persistencia de oportunidades do mercado futuro
- `services/fieldOperationsService.ts`: persistencia do diario de campo
- `services/liveHandlingService.ts`: persistencia do manejo em tempo real
- `services/commercialService.ts`: persistencia de catalogo/cartoes/lojas parceiras
- `services/logisticsService.ts`: persistencia de entradas logisticas
- `components/views/`: telas e modulos do sistema
- `lib/`: validadores, regras, trilha de auditoria e maquina de estados
- `firebase.json`, `firestore.rules`, `storage.rules`: backend local e seguranca

## Observacoes de estado atual

- Estoque, Cadastro de Propriedade, Financeiro (modulo consolidado), Juridico (modulo consolidado), Vendas, Workforce, Relatorios, Carbono, Mercado Publico, IA, Acao Operacional, Insumos Personalizados, Configuracoes do Sistema, Dicionario de Dados, Tabela de Operacoes, Matriz de Eventos, Fluxos de liquidacao, Arquitetura do Sistema, Mobile App (tarefas), Portal do Operador, Integracoes, Fornecedor, Integradora, Painel do Produtor, capability de Sementes dentro de Produtor (scope), Painel do Tecnico, Investidor, Gestao, Manejo, Mercado Futuro, Diario de Campo, Manejo Ao Vivo, Catalogo Comercial, Logistica e Contratos ja estao conectados ao Firestore.
- Auditoria real-mode atual (`node ../scripts/verify-firebase-real-mode.mjs`) sem ocorrencias de mock/seed nos modulos auditados.
- O projeto compila com `npm run build`.
- Em ambientes Windows com politica restritiva de `spawn` (erro `esbuild spawn EPERM`), o build pode falhar localmente mesmo com TypeScript ok.
- `services/contractsService.ts`: persistencia de contratos

## Modo Firebase real (producao)

- Producao exige `VITE_USE_FIREBASE_EMULATORS=false`.
- Producao exige variaveis `VITE_FIREBASE_*` preenchidas com projeto real.
- Producao usa backend `https://us-central1-<project-id>.cloudfunctions.net/api` (ou `VITE_BACKEND_BASE_URL` explicita).
- Deploy de producao foi configurado para publicar: Hosting + Functions API + Firestore Rules/Indexes + Storage Rules.


