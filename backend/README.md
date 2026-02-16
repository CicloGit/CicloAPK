# Ciclo+ Agro Backend (Node.js + TypeScript + Firebase Real)

Backend modular para o projeto Ciclo+ Agro, com Firestore e Storage em modo real via Firebase Admin SDK.

## Requisitos
- Node.js 20+
- npm 10+
- Credenciais Firebase Admin (ADC ou `GOOGLE_APPLICATION_CREDENTIALS`)

## Instalação
```bash
npm install
```

## Variáveis de ambiente
Copie `.env.example` para `.env` e ajuste:
- `PORT`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_STORAGE_BUCKET`
- `DEFAULT_FARM_HEALTHCHECK_ID`

## Executar em desenvolvimento
```bash
npm run dev
```

## Build e execução produção
```bash
npm run build
npm start
```

## OpenAPI / Swagger
- UI: `http://localhost:8080/api/docs`
- JSON: `http://localhost:8080/api/openapi.json`
- Export local:
```bash
npm run openapi:export
```
Arquivo exportado: `docs/openapi.json`.

## Healthcheck real do Firestore
Endpoint:
```http
GET /api/healthcheck?farmId=SEU_FARM_ID
```
Este endpoint grava e lê `farms/{farmId}/healthcheck/probe`.

## Autenticação e RBAC
A API usa cabeçalhos para RBAC:
- `x-user-id`
- `x-user-role` (`OPERADOR`, `TECNICO`, `GESTOR`, `AUDITOR`, `ADMIN`)
- `x-user-name` (opcional)

## Endpoints principais
- `POST /api/farms`
- `POST /api/farms/:farmId/locals`
- `POST /api/farms/:farmId/evidences/upload`
- `POST /api/farms/:farmId/animals`
- `POST /api/farms/:farmId/animals/birth`
- `POST /api/farms/:farmId/animals/purchase`
- `POST /api/farms/:farmId/animals/:animalId/stage`
- `POST /api/farms/:farmId/transfers`
- `POST /api/farms/:farmId/conferences/open`
- `POST /api/farms/:farmId/conferences/:id/count`
- `POST /api/farms/:farmId/conferences/:id/approve`
- `POST /api/farms/:farmId/conferences/:id/reject`
- `POST /api/farms/:farmId/stock/items`
- `POST /api/farms/:farmId/stock/in`
- `POST /api/farms/:farmId/stock/consume`
- `POST /api/farms/:farmId/invoices/in`
- `POST /api/farms/:farmId/feed`
- `POST /api/farms/:farmId/health`
- `POST /api/farms/:farmId/weighings`
- `POST /api/farms/:farmId/sales/orders`
- `POST /api/farms/:farmId/sales/orders/:id/issue`
- `GET /api/farms/:farmId/reports/locks`
- `GET /api/farms/:farmId/reports/balance-by-local`
- `GET /api/farms/:farmId/reports/gmd-by-lot`
- `GET /api/farms/:farmId/reports/consumption-by-lot`

## Regras de negócio implementadas
- Trava automática por divergência de cabeça (`delta != 0`) por local.
- Bloqueio de alimentação, sanidade, transferência e venda quando existe trava ativa.
- Conferência com estados `ABERTA -> EM_ANALISE -> APROVADA/REPROVADA`.
- Segregação de função: aprovador não pode ser quem abriu/contou a conferência.
- Política de evidências configurável por tipo de evento.
- Estoque FEFO sem saldo negativo.
- Auditoria obrigatória em `farms/{farmId}/events`.

## Estrutura
- `src/shared`: Firebase, auth, erros, middlewares, event bus.
- `src/modules`: módulos de negócio por domínio.
- `src/openapi`: OpenAPI e exportação de documentação.
