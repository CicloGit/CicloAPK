# Relatorio de modulos e prontidao

## Proposito do projeto

O Ciclo+ ERP Web e uma plataforma para gestao agro com multiplos perfis (Produtor, Gestor, Operador, Fornecedor, Integradora). O objetivo e centralizar dados de propriedade, estoque, operacao de campo, comercializacao e visibilidade gerencial em um unico sistema web.

## Arquitetura atual (resumo)

- Frontend React/TypeScript: telas em `components/views` e dashboards em `components/dashboards`.
- Sessao e perfil: `contexts/AppContext.tsx` com Firebase Auth.
- Persistencia:
  - Ja em Firebase/Firestore: propriedade, estoque, financeiro, vendas, comercial, logistica e contratos.
  - Ainda em mocks (`constants.ts`): maioria dos demais modulos.
- Backend local Firebase: `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`.

## Modulos de interface (rotas)

| Modulo | Arquivo | Funcao principal | Fonte de dados atual |
|---|---|---|---|
| Login | `components/views/LoginView.tsx` | Login/registro por e-mail e senha | Firebase Auth + `users` |
| Dashboard | `components/views/DashboardView.tsx` | Resumo operacional e KPIs | Mock |
| Architecture | `components/views/ArchitectureView.tsx` | Visualizacao da arquitetura do sistema | **Firestore** |
| Data Dictionary | `components/views/DataDictionaryView.tsx` | Entidades e campos de negocio | **Firestore** |
| Operations Table | `components/views/OperationsTableView.tsx` | Matriz de operacoes/regras | **Firestore** |
| Liquidation Flows | `components/views/LiquidationFlowsView.tsx` | Fluxos financeiros de liquidacao | **Firestore** |
| Events Matrix | `components/views/EventsMatrixView.tsx` | Matriz de eventos e regras | **Firestore** |
| System Config | `components/views/SystemConfigView.tsx` | Parametros de sistema | **Firestore** |
| Property Registration | `components/views/PropertyRegistrationView.tsx` | Cadastro da propriedade, CAR, divisao e atividades | **Firestore** |
| Operational Action | `components/views/OperationalActionView.tsx` | Registro de acoes operacionais | **Firestore** |
| Contracts | `components/views/producer/ContractsView.tsx` | Contratos do produtor | **Firestore** |
| Sales | `components/views/producer/SalesView.tsx` | Ofertas e vendas | **Firestore** |
| Financials | `components/views/producer/FinancialsView.tsx` | Receitas, despesas e contas | **Firestore** |
| Account Control | `components/views/producer/AccountControlView.tsx` | Detalhes de recebiveis | **Firestore** |
| Management | `components/views/producer/ManagementView.tsx` | Alertas e historico de manejo | **Firestore** |
| Future Market | `components/views/producer/FutureMarketView.tsx` | Oportunidades de mercado futuro | **Firestore** |
| Workforce | `components/views/producer/WorkforceView.tsx` | Equipe, folha e EPI | **Firestore** |
| Stock | `components/views/module/StockView.tsx` | Inventario, entradas, perdas e auditoria | **Firestore** |
| Commercial | `components/views/module/CommercialView.tsx` | Marketplace e compras | **Firestore (catalogo/cartoes/lojas)** |
| Logistics | `components/views/module/LogisticsView.tsx` | Entregas/coletas | **Firestore** |
| AI Analysis | `components/views/module/AIAnalysisView.tsx` | Simulacoes de IA/analise | **Firestore** |
| Live Handling | `components/views/producer/LiveHandlingView.tsx` | Manejo em tempo real | **Firestore** |
| Integrations | `components/views/IntegrationsView.tsx` | Integracoes externas | **Firestore** |
| Field Operations | `components/views/producer/FieldOperationsView.tsx` | Solicitacoes e tarefas de campo | **Firestore** |
| Reports | `components/views/producer/ReportsView.tsx` | Relatorios e metricas | **Firestore** |
| Carbon Market | `components/views/producer/CarbonMarketView.tsx` | Projetos e creditos de carbono | **Firestore** |
| Custom Input Request | `components/views/producer/CustomInputRequestView.tsx` | Requisicao customizada de insumos | **Firestore** |
| Operator Portal | `components/views/operator/OperatorPortalView.tsx` | Operacao diaria do operador | **Firestore** |
| Supplier Portal | `components/dashboards/SupplierDashboard.tsx` | Painel de fornecedor | **Firestore** |
| Integrator Portal | `components/dashboards/IntegratorDashboard.tsx` | Painel de integradora | **Firestore** |
| Technician Portal | `components/dashboards/TechnicianDashboard.tsx` | Portal tecnico | **Firestore** |
| Investor Portal | `components/dashboards/InvestorDashboard.tsx` | Portal investidor | **Firestore** |
| Finance | `components/views/FinanceView.tsx` | Modulo financeiro consolidado | **Firestore** |
| Legal | `components/views/LegalView.tsx` | Modulo juridico consolidado | **Firestore** |
| Mobile App | `components/views/mobile/MobileAppView.tsx` | Experiencia mobile | **Firestore** |
| Public Market | `components/views/public/PublicMarketView.tsx` | Portal publico de inteligencia | **Firestore** |
| Unauthorized | `components/views/UnauthorizedView.tsx` | Bloqueio de acesso por perfil | N/A |

## Dashboards adicionais no repositorio

| Dashboard | Arquivo | Status |
|---|---|---|
| Producer Dashboard | `components/dashboards/ProducerDashboard.tsx` | **Firestore** |
| Technician Dashboard | `components/dashboards/TechnicianDashboard.tsx` | **Firestore** |
| Seed Producer Dashboard | `components/dashboards/SeedProducerDashboard.tsx` | **Firestore** |
| Investor Dashboard | `components/dashboards/InvestorDashboard.tsx` | **Firestore** |
| Manager Dashboard | `components/dashboards/ManagerDashboard.tsx` | **Firestore** |

## Modulos de backend e dominio

| Modulo tecnico | Arquivo | Funcao |
|---|---|---|
| Firebase client | `config/firebase.ts` | Inicializa app/auth/firestore/storage e conecta emuladores |
| Auth/session | `contexts/AppContext.tsx` | Login, registro, logout e perfil de usuario |
| Property service | `services/propertyService.ts` | CRUD de propriedade, pastos e projetos |
| Stock service | `services/stockService.ts` | CRUD de inventario/movimentos e auditoria |
| Financial service | `services/financialService.ts` | CRUD de contas, recebiveis, despesas e transacoes |
| Sales service | `services/salesService.ts` | CRUD de ofertas de venda |
| Workforce service | `services/workforceService.ts` | CRUD de equipe/ponto/folha/epis |
| Reports service | `services/reportsService.ts` | CRUD de relatorios e indicadores |
| Carbon service | `services/carbonService.ts` | CRUD de praticas/projetos/creditos de carbono |
| Public market service | `services/publicMarketService.ts` | CRUD de tendencias/noticias/estatisticas/leiloes |
| AI Analysis service | `services/aiAnalysisService.ts` | CRUD de analises de IA |
| Operational action service | `services/operationalActionService.ts` | CRUD de acoes operacionais |
| Custom input service | `services/customInputService.ts` | CRUD de solicitacoes e formulas customizadas |
| System config service | `services/systemConfigService.ts` | CRUD de configuracoes do sistema |
| Data dictionary service | `services/dataDictionaryService.ts` | CRUD de entidades do dicionario de dados |
| Operations table service | `services/operationsTableService.ts` | CRUD da tabela de operacoes |
| Events matrix service | `services/eventsMatrixService.ts` | CRUD da matriz de eventos |
| Liquidation flows service | `services/liquidationFlowsService.ts` | CRUD dos fluxos de liquidacao |
| Architecture service | `services/architectureService.ts` | CRUD da arquitetura do sistema |
| Operator service | `services/operatorService.ts` | CRUD de tarefas e solicitacoes do operador |
| Integrations service | `services/integrationsService.ts` | CRUD de status e solicitacoes de integracao |
| Supplier service | `services/supplierService.ts` | CRUD de pedidos e financeiro do fornecedor |
| Integrator service | `services/integratorService.ts` | CRUD de produtores/ofertas/mensagens da integradora |
| Producer dashboard service | `services/producerDashboardService.ts` | CRUD de indicadores/detalhes do produtor |
| Technician service | `services/technicianService.ts` | CRUD de indicadores/relatorios do tecnico |
| Seed producer service | `services/seedProducerService.ts` | CRUD de campos/lotes/certificacao de sementes |
| Investor service | `services/investorService.ts` | CRUD de kpis/projetos do investidor |
| Manager service | `services/managerService.ts` | CRUD de kpis/atividades de gestao |
| Management service | `services/managementService.ts` | CRUD de alertas/historico de manejo |
| Future market service | `services/futureMarketService.ts` | CRUD de oportunidades de mercado futuro |
| Field operations service | `services/fieldOperationsService.ts` | CRUD de diario de campo |
| Live handling service | `services/liveHandlingService.ts` | CRUD de manejo ao vivo |
| Commercial service | `services/commercialService.ts` | CRUD de catalogo, cartoes corporativos e lojas parceiras |
| Logistics service | `services/logisticsService.ts` | CRUD de entradas logisticas |
| Contracts service | `services/contractsService.ts` | CRUD de contratos |
| Validators | `lib/validators.ts` | Validacoes de formularios e regras de entrada |
| Rules engine | `lib/rulesEngine.ts` | Regras de negocio (ex.: estoque suficiente) |
| State machine | `lib/stateMachine.ts` | Transicoes de estado de estoque |
| Audit chain | `lib/auditChain.ts` | Hash encadeado para eventos auditaveis |
| Access control | `config/accessControl.ts` | Mapeia permissoes por papel |
## O que falta para rodar 100% local (Frontend + Backend)

### Ja concluido

- Build validado com sucesso (`npm run build`).
- Login e registro em Firebase Auth.
- Persistencia Firestore para:
  - Cadastro de propriedade (`properties`, `pastures`, `productionProjects`)
  - Estoque e auditoria (`inventoryItems`, `stockMovements`, `auditEvents`)
   - Financeiro (`bankAccounts`, `receivables`, `expenses`, `transactions`)
  - Vendas (`salesOffers`)
  - Workforce (`employees`, `timeRecords`, `payrollEntries`, `ppeOrders`)
  - Relatorios (`marketTrends`, `reportConsumptions`, `reportCapacity`)
  - Carbono (`sustainablePractices`, `carbonProjects`, `carbonCredits`)
  - Mercado publico (`marketTrends`, `regionalStats`, `newsItems`, `auctionListings`, `marketSaturation`)
  - IA (`aiAnalyses`)
  - Acoes operacionais (`operationalActions`)
  - Insumos customizados (`customInputRequests`, `customInputFormulas`, `customInputPastures`)
  - Configuracoes do sistema (`systemConfigs`)
  - Dicionario de dados (`dataDictionaryEntities`)
  - Tabela de operacoes (`operationsTable`)
  - Matriz de eventos (`eventsMatrix`)
  - Fluxos de liquidacao (`liquidationFlows`)
  - Arquitetura do sistema (`architectureNodes`)
  - Portal operador (`operatorRequests`, `operatorTasks`)
  - Integracoes (`integrationStatus`, `integrationRequests`)
  - Portal fornecedor (`supplierOrders`, `supplierFinancials`)
  - Portal integradora (`integratedProducers`, `partnershipOffers`, `integratorMessages`)
  - Painel produtor (`financialDetails`, `animalDetails`, `sectorDetails`, `stageDetails`, `projectStages`)
  - Painel tecnico (`technicianKpis`, `technicianReports`)
  - Produtor de sementes (`seedFields`, `seedLots`, `seedCertifications`)
  - Investidor (`investorKpis`, `investorProjects`)
  - Gestao (`managerKpis`, `managerActivities`)
  - Manejo (`managementAlerts`, `managementHistory`)
  - Mercado futuro (`marketOpportunities`)
  - Diario de campo (`fieldDiaryEntries`)
  - Manejo ao vivo (`liveHandlingContext`, `liveHandlingHistory`)
  - Comercial (`marketplaceListings`, `corporateCards`, `partnerStores`)
  - Logistica (`logisticsEntries`)
  - Contratos (`contracts`)
- Configuracao local Firebase criada:
  - `.firebaserc`
  - `firebase.json`
  - `firestore.rules`
  - `firestore.indexes.json`
  - `storage.rules`

### Faltas tecnicas principais

1. Migracao para modo real concluida no codigo ativo (services/components/config/contexts auditados).
2. Padronizar camada de dados:
   - Criar servicos por dominio (ex.: `financialService`, `commercialService`, `logisticsService`).
3. Endurecer regras de seguranca Firestore/Storage para cenario de producao:
   - Hoje as regras estao funcionais para fase inicial, mas ainda permissivas para alguns fluxos.
4. Upload real de comprovantes de perda (Storage):
   - `StockView` ainda usa URL simulada para prova.
5. Eliminacao de dependencias de mock em `constants.ts` e limpeza de duplicidades de componentes.
6. Testes automatizados (unitario + integracao) e pipeline CI/CD.
7. Observabilidade:
   - logs estruturados, monitoramento de erro e auditoria centralizada.
8. Fluxo transacional do marketplace:
   - pedidos do checkout comercial ainda sao confirmados localmente (sem persistencia de ordem/pagamento).

## O que voce precisa me fornecer

1. Credenciais do Firebase (projeto real) para `/.env.local`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
2. Decisao de ambiente inicial:
   - somente emulador local ou ja conectar no Firebase cloud.
3. Regras de negocio finais por modulo:
   - permissao por perfil, aprovacoes, bloqueios e estados obrigatorios.
4. Escopo de prioridade de migracao:
   - qual modulo sai primeiro apos Propriedade/Estoque/Financeiro.
5. Definicao de producao:
   - dominio final, estrategia de deploy frontend e requisitos de SLA.

## Checklist de producao (meta alvo)

- [x] Todos os modulos sem mock no runtime auditado
- [ ] Regras Firestore/Storage revisadas e testadas
- [ ] Upload de evidencias e trilha de auditoria completa
- [ ] Testes e CI com build + typecheck + smoke tests
- [ ] Segredos/variaveis gerenciados por ambiente
- [ ] Monitoramento e alertas ativos
- [ ] Backup/restore e politica de retencao

## Proximo passo recomendado

1. Validar autenticacao + propriedade + estoque em emulador local.
2. Definir o proximo modulo para migracao (recomendo `AIAnalysisView`).
3. Eu implemento o servico Firebase desse modulo, removo mocks da tela e entrego com build validado.

