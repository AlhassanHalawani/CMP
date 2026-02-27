#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-cmp}"
GH_USER="${GH_USER:-}"
CR_PAT="${CR_PAT:-}"
TAG="${TAG:-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M)}"
ROLLBACK_ON_FAIL="${ROLLBACK_ON_FAIL:-true}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-180s}"
KEYCLOAK_URL="${VITE_KEYCLOAK_URL:-https://keycloak.fcitcmp.com}"
KEYCLOAK_REALM="${VITE_KEYCLOAK_REALM:-cmp}"
KEYCLOAK_CLIENT_ID="${VITE_KEYCLOAK_CLIENT_ID:-cmp-app}"
BUILD_RETRIES="${BUILD_RETRIES:-3}"
BUILD_RETRY_DELAY="${BUILD_RETRY_DELAY:-5}"
ALLOW_DIRTY_GIT="${ALLOW_DIRTY_GIT:-false}"

BACKEND_IMAGE="ghcr.io/${GH_USER}/cmp-backend:${TAG}"
FRONTEND_IMAGE="ghcr.io/${GH_USER}/cmp-frontend:${TAG}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: required command not found: $cmd" >&2
    exit 1
  fi
}

validate_env() {
  if [[ -z "$GH_USER" ]]; then
    echo "error: GH_USER is required" >&2
    exit 1
  fi
  if [[ -z "$CR_PAT" ]]; then
    echo "error: CR_PAT is required (use env var; do not inline in shell history)" >&2
    exit 1
  fi
}

ensure_clean_git() {
  if [[ "$ALLOW_DIRTY_GIT" == "true" ]]; then
    return 0
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "error: git working tree is dirty; commit/stash changes first (or set ALLOW_DIRTY_GIT=true)" >&2
    exit 1
  fi
}

retry_cmd() {
  local attempts="$1"
  local delay="$2"
  shift 2

  local n=1
  while true; do
    if "$@"; then
      return 0
    fi

    if [[ "$n" -ge "$attempts" ]]; then
      echo "error: command failed after ${attempts} attempts: $*" >&2
      return 1
    fi

    echo "warning: command failed (attempt ${n}/${attempts}); retrying in ${delay}s: $*" >&2
    n=$((n + 1))
    sleep "$delay"
  done
}

diagnostics() {
  echo "=== rollout diagnostics (namespace: ${NAMESPACE}) ===" >&2
  kubectl -n "$NAMESPACE" get deploy cmp-backend cmp-frontend -o wide || true
  kubectl -n "$NAMESPACE" get pods -o wide || true
  kubectl -n "$NAMESPACE" get events --sort-by=.metadata.creationTimestamp | tail -n 50 || true

  local backend_pod
  backend_pod="$(kubectl -n "$NAMESPACE" get pods -l app=cmp-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
  if [[ -n "$backend_pod" ]]; then
    kubectl -n "$NAMESPACE" describe pod "$backend_pod" || true
  fi

  local frontend_pod
  frontend_pod="$(kubectl -n "$NAMESPACE" get pods -l app=cmp-frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
  if [[ -n "$frontend_pod" ]]; then
    kubectl -n "$NAMESPACE" describe pod "$frontend_pod" || true
  fi
}

rollback_if_enabled() {
  if [[ "$ROLLBACK_ON_FAIL" != "true" ]]; then
    return 0
  fi

  if [[ -n "${PREV_BACKEND_IMAGE:-}" ]]; then
    echo "Rolling back backend to ${PREV_BACKEND_IMAGE}" >&2
    kubectl -n "$NAMESPACE" set image deploy/cmp-backend backend="$PREV_BACKEND_IMAGE" --record=false || true
  fi

  if [[ -n "${PREV_FRONTEND_IMAGE:-}" ]]; then
    echo "Rolling back frontend to ${PREV_FRONTEND_IMAGE}" >&2
    kubectl -n "$NAMESPACE" set image deploy/cmp-frontend frontend="$PREV_FRONTEND_IMAGE" --record=false || true
  fi

  kubectl -n "$NAMESPACE" rollout status deploy/cmp-backend --timeout="$ROLLOUT_TIMEOUT" || true
  kubectl -n "$NAMESPACE" rollout status deploy/cmp-frontend --timeout="$ROLLOUT_TIMEOUT" || true
}

on_error() {
  echo "error: release failed" >&2
  diagnostics
  rollback_if_enabled
}
trap on_error ERR

require_cmd docker
require_cmd kubectl
require_cmd git
validate_env
ensure_clean_git

echo "Using tag: ${TAG}"

echo "$CR_PAT" | docker login ghcr.io -u "$GH_USER" --password-stdin

echo "Building and pushing backend: ${BACKEND_IMAGE}"
retry_cmd "$BUILD_RETRIES" "$BUILD_RETRY_DELAY" docker buildx build --platform linux/arm64 \
  -f apps/backend/Dockerfile \
  -t "$BACKEND_IMAGE" \
  --push .

echo "Building and pushing frontend: ${FRONTEND_IMAGE}"
retry_cmd "$BUILD_RETRIES" "$BUILD_RETRY_DELAY" docker buildx build --platform linux/arm64 \
  -f apps/frontend/Dockerfile \
  -t "$FRONTEND_IMAGE" \
  --build-arg VITE_KEYCLOAK_URL="$KEYCLOAK_URL" \
  --build-arg VITE_KEYCLOAK_REALM="$KEYCLOAK_REALM" \
  --build-arg VITE_KEYCLOAK_CLIENT_ID="$KEYCLOAK_CLIENT_ID" \
  --push .

echo "Verifying remote tags exist in GHCR"
docker buildx imagetools inspect "$BACKEND_IMAGE" >/dev/null
docker buildx imagetools inspect "$FRONTEND_IMAGE" >/dev/null

echo "Refreshing pull secret: ghcr-creds"
kubectl -n "$NAMESPACE" delete secret ghcr-creds --ignore-not-found
kubectl -n "$NAMESPACE" create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username="$GH_USER" \
  --docker-password="$CR_PAT"

# Ensure deployments explicitly reference the GHCR pull secret.
kubectl -n "$NAMESPACE" patch deploy cmp-backend --type=merge -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-creds"}]}}}}'
kubectl -n "$NAMESPACE" patch deploy cmp-frontend --type=merge -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-creds"}]}}}}'

PREV_BACKEND_IMAGE="$(kubectl -n "$NAMESPACE" get deploy cmp-backend -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].image}')"
PREV_FRONTEND_IMAGE="$(kubectl -n "$NAMESPACE" get deploy cmp-frontend -o jsonpath='{.spec.template.spec.containers[?(@.name=="frontend")].image}')"

echo "Updating deployment images"
kubectl -n "$NAMESPACE" set image deploy/cmp-backend backend="$BACKEND_IMAGE" --record=false
kubectl -n "$NAMESPACE" set image deploy/cmp-frontend frontend="$FRONTEND_IMAGE" --record=false

echo "Waiting for rollout"
kubectl -n "$NAMESPACE" rollout status deploy/cmp-backend --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status deploy/cmp-frontend --timeout="$ROLLOUT_TIMEOUT"

echo "Release complete"
kubectl -n "$NAMESPACE" get deploy cmp-backend cmp-frontend -o wide
kubectl -n "$NAMESPACE" get pods -o wide
