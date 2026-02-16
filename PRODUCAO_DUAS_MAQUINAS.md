# Producao Segura Com Duas Maquinas

## Objetivo
Evitar sobrescrita acidental em producao quando duas maquinas codificam ao mesmo tempo.

## Regras Operacionais
1. Nao fazer deploy de producao direto da maquina local por padrao.
2. Toda mudanca entra por Pull Request para `main`.
3. Apenas `main` dispara deploy de producao.
4. Deploy de producao e feito somente pelo workflow `Production Deploy`.
5. Cada maquina sempre sincroniza antes de iniciar trabalho:
   `git syncsafe`

## Fluxo Recomendado (Dia a Dia)
1. Sincronizar: `git syncsafe`
2. Criar branch de trabalho:
   `git checkout -b feat/<descricao>-<maquina>`
3. Commit e push da branch.
4. Abrir PR para `main`.
5. Esperar CI verde.
6. Fazer merge.
7. Aguardar workflow `Production Deploy` concluir.

## Protecoes Obrigatorias no GitHub
Configurar em `Settings > Branches > Branch protection rules` para `main`:
- `Require a pull request before merging`
- `Require status checks to pass before merging`
- `Require branches to be up to date before merging`
- `Do not allow force pushes`
- `Do not allow deletions`
- `Restrict who can push to matching branches` (somente maintainers)

Configurar em `Settings > Environments > production`:
- `Required reviewers` (pelo menos 1)
- Opcional: `Wait timer` (5 minutos)

Configurar em `Settings > Secrets and variables > Actions`:
- `FIREBASE_TOKEN`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Deploy de Producao
- Workflow: `.github/workflows/production-deploy.yml`
- Concurrency lock: apenas um deploy por vez.
- Publicacao conjunta: `hosting` + `functions:api`.
- Validacao estrita de modo real: `scripts/verify-firebase-real-mode.mjs` (bloqueia mocks em producao).

## Emergencia (Deploy Local Controlado)
Somente para incidente:

```bash
ALLOW_PROD_LOCAL_DEPLOY=1 FIREBASE_PROJECT=ciclo-plus-f9c8f ./scripts/firebase-deploy-safe.sh ciclo-plus-f9c8f
```

Bypass de mocks (somente emergencia e com aprovacao):

```bash
ALLOW_MOCKS_IN_PRODUCTION=1 ALLOW_PROD_LOCAL_DEPLOY=1 FIREBASE_PROJECT=ciclo-plus-f9c8f ./scripts/firebase-deploy-safe.sh ciclo-plus-f9c8f
```

## Checklist de Release
- [ ] Branch local sincronizada (`git syncsafe`)
- [ ] PR aprovado
- [ ] CI verde (`Web Build` e `Functions Build`)
- [ ] Deploy de producao concluido no GitHub Actions
- [ ] Smoke test web + backend (`/api/health`)
