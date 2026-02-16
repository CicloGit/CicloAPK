#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "Nao foi possivel identificar a branch atual."
  exit 1
fi

UPSTREAM_REF="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
if [[ -z "$UPSTREAM_REF" ]]; then
  if git show-ref --verify --quiet refs/remotes/origin/main; then
    UPSTREAM_REF="origin/main"
  else
    echo "Branch sem upstream e origin/main nao encontrado."
    exit 1
  fi
fi

STASH_CREATED=0
STASH_LABEL="autosync-$(date +%Y%m%d-%H%M%S)"
RESTORED=0

restore_stash_on_error() {
  if [[ "$STASH_CREATED" -eq 1 && "$RESTORED" -eq 0 ]]; then
    git stash pop >/dev/null || true
    RESTORED=1
    echo "Falha na sincronizacao. Alteracoes locais foram restauradas."
  fi
}

trap restore_stash_on_error ERR

if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  git stash push -u -m "$STASH_LABEL" >/dev/null
  STASH_CREATED=1
  echo "Alteracoes locais salvas temporariamente: $STASH_LABEL"
fi

git fetch origin --prune
git rebase "$UPSTREAM_REF"
echo "Branch atualizada com $UPSTREAM_REF"

if [[ "$STASH_CREATED" -eq 1 ]]; then
  if git stash pop >/dev/null; then
    RESTORED=1
    echo "Alteracoes locais restauradas."
  else
    echo "Conflitos ao restaurar alteracoes locais. Resolva os conflitos e continue."
    exit 1
  fi
fi

trap - ERR
echo "Sincronizacao concluida."
