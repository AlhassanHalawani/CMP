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
KEYCLOAK_IMAGE="${KEYCLOAK_IMAGE:-}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-180s}"

if [[ -z "$GH_USER" ]];        then echo "error: GH_USER is required" >&2;        exit 1; fi
if [[ -z "$CR_PAT" ]];         then echo "error: CR_PAT is required" >&2;         exit 1; fi
if [[ -z "$BACKEND_IMAGE" ]];  then echo "error: BACKEND_IMAGE is required" >&2;  exit 1; fi
if [[ -z "$FRONTEND_IMAGE" ]]; then echo "error: FRONTEND_IMAGE is required" >&2; exit 1; fi
if [[ -z "$KEYCLOAK_IMAGE" ]]; then echo "error: KEYCLOAK_IMAGE is required" >&2; exit 1; fi

# Ensure kubectl can reach the cluster; fall back to k3s admin kubeconfig
K3S_YAML=/etc/rancher/k3s/k3s.yaml
if ! kubectl cluster-info &>/dev/null; then
  if [[ -f "$K3S_YAML" ]]; then
    echo "kubectl auth failed — falling back to $K3S_YAML"
    export KUBECONFIG="$K3S_YAML"
  else
    echo "error: kubectl cannot authenticate and $K3S_YAML not found." >&2
    echo "       Run: sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown \$(id -u):\$(id -g) ~/.kube/config" >&2
    exit 1
  fi
  # Verify the fallback actually works
  if ! kubectl cluster-info &>/dev/null; then
    echo "error: kubectl still cannot authenticate even with $K3S_YAML." >&2
    echo "       Check k3s is running: sudo systemctl status k3s" >&2
    exit 1
  fi
fi

echo "Deploying to namespace: ${NAMESPACE}"
echo "Backend:  ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"
echo "Keycloak: ${KEYCLOAK_IMAGE}"

echo "Refreshing pull secret..."
kubectl -n "$NAMESPACE" delete secret ghcr-creds --ignore-not-found
kubectl -n "$NAMESPACE" create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username="$GH_USER" \
  --docker-password="$CR_PAT"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Applying deployment manifests..."
kubectl apply -f "$REPO_ROOT/infra/k8s/backend/deployment.yaml"
kubectl apply -f "$REPO_ROOT/infra/k8s/frontend/deployment.yaml"
kubectl apply -f "$REPO_ROOT/infra/k8s/keycloak/statefulset.yaml"

echo "Updating deployment images..."
kubectl -n "$NAMESPACE" set image deploy/cmp-backend \
  backend="$BACKEND_IMAGE" \
  migrate="$BACKEND_IMAGE"
kubectl -n "$NAMESPACE" set image deploy/cmp-frontend \
  frontend="$FRONTEND_IMAGE"
kubectl -n "$NAMESPACE" set image statefulset/cmp-keycloak \
  keycloak="$KEYCLOAK_IMAGE"

echo "Waiting for rollout..."
kubectl -n "$NAMESPACE" rollout status deploy/cmp-backend --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status deploy/cmp-frontend --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status statefulset/cmp-keycloak --timeout="$ROLLOUT_TIMEOUT"

echo ""
echo "Deploy complete."
kubectl -n "$NAMESPACE" get deploy cmp-backend cmp-frontend -o wide
kubectl -n "$NAMESPACE" get statefulset cmp-keycloak -o wide
kubectl -n "$NAMESPACE" get pods -o wide
