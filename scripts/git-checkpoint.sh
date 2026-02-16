#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Branch atual invalida (detached HEAD)."
  exit 1
fi

MESSAGE="${*:-checkpoint: $(date '+%Y-%m-%d %H:%M:%S')}"

git add -A

if git diff --cached --quiet; then
  echo "Sem alteracoes para commit."
  exit 0
fi

git commit -m "$MESSAGE"

UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
if [[ -z "$UPSTREAM" ]]; then
  git push -u origin "$BRANCH"
else
  git push
fi

echo "Checkpoint publicado na branch: $BRANCH"
