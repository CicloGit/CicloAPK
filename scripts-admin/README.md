# Scripts Admin (Custom Claims)

## Objetivo
Atualizar claims em lote para unificar:
- role unica de produtor: `PRODUCER`
- capability de sementes via scope: `producerScopes.seedProducer`

## Pre-requisitos
1. Node.js 22+
2. Credencial Admin via `GOOGLE_APPLICATION_CREDENTIALS` (arquivo JSON fora do repo)
3. Dependencias:
```bash
cd scripts-admin
npm install
```

## CSV esperado
Cabecalho:
```csv
uid,tenantId,seedProducer,role
```

Exemplo:
```csv
uid,tenantId,seedProducer,role
abc123,tenant-01,true,PRODUCER
def456,tenant-02,false,PRODUCER
ghi789,tenant-03,false,MANAGER
```

## Execucao
```bash
cd scripts-admin
node set-claims-batch.mjs .\users-claims.csv
```

## Seguranca
- Nao comitar JSON de service account.
- Use apenas `GOOGLE_APPLICATION_CREDENTIALS` no ambiente local/CI seguro.

