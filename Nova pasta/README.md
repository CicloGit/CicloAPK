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

- Estoque, Cadastro de Propriedade, Financeiro (modulo consolidado), Juridico (modulo consolidado), Vendas, Workforce, Relatorios, Carbono, Mercado Publico, IA, Acao Operacional, Insumos Personalizados, Configuracoes do Sistema, Dicionario de Dados, Tabela de Operacoes, Matriz de Eventos, Fluxos de Liquidacao, Arquitetura do Sistema, Mobile App (tarefas), Portal do Operador, Integracoes, Fornecedor, Integradora, Painel do Produtor, Painel do Tecnico, Produtor de Sementes, Investidor, Gestao, Manejo, Mercado Futuro, Diario de Campo, Manejo Ao Vivo, Catalogo Comercial, Logistica e Contratos ja estao conectados ao Firestore.
- Diversos modulos ainda usam mocks de `constants.ts` e precisam migrar para servicos Firebase.
- O projeto compila com `npm run build`.
- `services/contractsService.ts`: persistencia de contratos
