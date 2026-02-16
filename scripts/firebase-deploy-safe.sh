#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="$REPO_ROOT/Nova pasta"
FUNCTIONS_DIR="$APP_DIR/functions"
SYNC_SCRIPT="$REPO_ROOT/scripts/git-sync-safe.sh"
ENV_FILE="$APP_DIR/.env.local"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Diretorio da aplicacao nao encontrado: $APP_DIR"
  exit 1
fi

if [[ ! -f "$SYNC_SCRIPT" ]]; then
  echo "Script de sincronizacao nao encontrado: $SYNC_SCRIPT"
  exit 1
fi

PROJECT_ID="${1:-${FIREBASE_PROJECT:-}}"
PROD_PROJECT_ID="${PROD_PROJECT_ID:-ciclo-plus-f9c8f}"
ALLOW_PROD_LOCAL_DEPLOY="${ALLOW_PROD_LOCAL_DEPLOY:-0}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Projeto nao informado."
  echo "Uso: FIREBASE_PROJECT=<project-id> $0 [project-id]"
  exit 1
fi

CURRENT_BRANCH="$(git -C "$REPO_ROOT" branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Deploy bloqueado: branch atual '$CURRENT_BRANCH'. Use a branch main."
  exit 1
fi

echo "Projeto de deploy: $PROJECT_ID"
echo "Passo 1/8: sincronizando branch atual sem perder alteracoes locais..."
"$SYNC_SCRIPT"

if ! git -C "$REPO_ROOT" diff --quiet || ! git -C "$REPO_ROOT" diff --cached --quiet; then
  echo "Deploy bloqueado: existem alteracoes locais nao commitadas."
  exit 1
fi

git -C "$REPO_ROOT" fetch origin main --prune
LOCAL_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD)"
REMOTE_SHA="$(git -C "$REPO_ROOT" rev-parse origin/main)"
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  echo "Deploy bloqueado: main local nao esta alinhada com origin/main."
  echo "local:  $LOCAL_SHA"
  echo "remote: $REMOTE_SHA"
  exit 1
fi

if [[ "$PROJECT_ID" == "$PROD_PROJECT_ID" && "$ALLOW_PROD_LOCAL_DEPLOY" != "1" ]]; then
  echo "Deploy local de producao bloqueado por padrao."
  echo "Use o workflow GitHub 'Production Deploy'."
  echo "Para emergencia controlada:"
  echo "ALLOW_PROD_LOCAL_DEPLOY=1 FIREBASE_PROJECT=$PROJECT_ID $0 $PROJECT_ID"
  exit 1
fi

if [[ "$PROJECT_ID" == "$PROD_PROJECT_ID" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Deploy bloqueado: arquivo nao encontrado: $ENV_FILE"
    exit 1
  fi

  for key in \
    VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID \
    VITE_BACKEND_BASE_URL; do
    if ! grep -Eq "^${key}=.+" "$ENV_FILE"; then
      echo "Deploy bloqueado: variavel obrigatoria ausente em $ENV_FILE -> $key"
      exit 1
    fi
  done

  if grep -Eq '^VITE_USE_FIREBASE_EMULATORS=true' "$ENV_FILE"; then
    echo "Deploy bloqueado: producao nao pode usar VITE_USE_FIREBASE_EMULATORS=true"
    exit 1
  fi

  echo "Validando modo real estrito (sem mocks)..."
  node "$REPO_ROOT/scripts/verify-firebase-real-mode.mjs"
fi

echo "Passo 2/8: instalando dependencias do web app..."
cd "$APP_DIR"
npm ci

echo "Passo 3/8: executando typecheck..."
npm run typecheck

echo "Passo 4/8: gerando build de producao..."
npm run build

echo "Passo 5/8: instalando dependencias das functions..."
cd "$FUNCTIONS_DIR"
npm install

echo "Passo 6/8: compilando functions..."
npm run build

echo "Passo 7/8: publicando Hosting + Functions API + Rules/Indexes..."
cd "$APP_DIR"
npx firebase-tools deploy --only "hosting,functions:api,firestore:rules,firestore:indexes,storage" --project "$PROJECT_ID"

echo "Passo 8/8: executando smoke test de producao..."
WEB_URL="https://${PROJECT_ID}.web.app"
API_HEALTH_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/api/health"
curl -fsS "$WEB_URL" >/dev/null
curl -fsS "$API_HEALTH_URL" | grep -q '"status":"ok"'

echo "Deploy concluido com sucesso para: $PROJECT_ID (commit $LOCAL_SHA)"
