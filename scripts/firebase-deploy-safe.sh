#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="$REPO_ROOT/Nova pasta"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Diretorio da aplicacao nao encontrado: $APP_DIR"
  exit 1
fi

PROJECT_ID="${1:-${FIREBASE_PROJECT:-ciclo-plus-f9c8f}}"

echo "Projeto de deploy: $PROJECT_ID"
echo "Passo 1/3: sincronizando branch atual sem perder alteracoes locais..."
git -C "$REPO_ROOT" syncsafe

echo "Passo 2/3: gerando build de producao..."
cd "$APP_DIR"
npm run build

echo "Passo 3/3: publicando Firebase Hosting..."
npx firebase-tools deploy --only hosting --project "$PROJECT_ID"

echo "Deploy concluido com sucesso para: $PROJECT_ID"
