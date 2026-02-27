#!/usr/bin/env bash
# Deploy pre-built images to the k3s cluster.
# Run this on the Pi (or any machine with kubectl access to the cluster).
#
# Usage:
#   BACKEND_IMAGE=ghcr.io/you/cmp-backend:TAG \
#   FRONTEND_IMAGE=ghcr.io/you/cmp-frontend:TAG \
#   GH_USER=you CR_PAT=ghp_xxx \
#   bash scripts/deploy-k3s.sh
set -euo pipefail

NAMESPACE="${NAMESPACE:-cmp}"
GH_USER="${GH_USER:-}"
CR_PAT="${CR_PAT:-}"
BACKEND_IMAGE="${BACKEND_IMAGE:-}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-180s}"

if [[ -z "$GH_USER" ]];        then echo "error: GH_USER is required" >&2;        exit 1; fi
if [[ -z "$CR_PAT" ]];         then echo "error: CR_PAT is required" >&2;         exit 1; fi
if [[ -z "$BACKEND_IMAGE" ]];  then echo "error: BACKEND_IMAGE is required" >&2;  exit 1; fi
if [[ -z "$FRONTEND_IMAGE" ]]; then echo "error: FRONTEND_IMAGE is required" >&2; exit 1; fi

echo "Deploying to namespace: ${NAMESPACE}"
echo "Backend:  ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"

echo "Refreshing pull secret..."
kubectl -n "$NAMESPACE" delete secret ghcr-creds --ignore-not-found
kubectl -n "$NAMESPACE" create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username="$GH_USER" \
  --docker-password="$CR_PAT"

echo "Updating deployment images..."
kubectl -n "$NAMESPACE" set image deploy/cmp-backend \
  backend="$BACKEND_IMAGE" \
  migrate="$BACKEND_IMAGE"
kubectl -n "$NAMESPACE" set image deploy/cmp-frontend \
  frontend="$FRONTEND_IMAGE"

echo "Waiting for rollout..."
kubectl -n "$NAMESPACE" rollout status deploy/cmp-backend --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status deploy/cmp-frontend --timeout="$ROLLOUT_TIMEOUT"

echo ""
echo "Deploy complete."
kubectl -n "$NAMESPACE" get deploy cmp-backend cmp-frontend -o wide
kubectl -n "$NAMESPACE" get pods -o wide
