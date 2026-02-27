#!/usr/bin/env bash
# Build ARM64 images and push to GHCR.
# Run this from the Codespace/dev machine (not the Pi).
#
# Usage:
#   GH_USER=you CR_PAT=ghp_xxx bash scripts/build-push.sh
#
# Outputs the TAG to use with deploy-k3s.sh.
set -euo pipefail

GH_USER="${GH_USER:-}"
CR_PAT="${CR_PAT:-}"
TAG="${TAG:-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M)}"
KEYCLOAK_URL="${VITE_KEYCLOAK_URL:-https://keycloak.fcitcmp.com}"
KEYCLOAK_REALM="${VITE_KEYCLOAK_REALM:-cmp}"
KEYCLOAK_CLIENT_ID="${VITE_KEYCLOAK_CLIENT_ID:-cmp-app}"

if [[ -z "$GH_USER" ]]; then echo "error: GH_USER is required" >&2; exit 1; fi
if [[ -z "$CR_PAT" ]]; then echo "error: CR_PAT is required" >&2; exit 1; fi

BACKEND_IMAGE="ghcr.io/${GH_USER}/cmp-backend:${TAG}"
FRONTEND_IMAGE="ghcr.io/${GH_USER}/cmp-frontend:${TAG}"

echo "Tag: ${TAG}"
echo "Backend:  ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"

echo "$CR_PAT" | docker login ghcr.io -u "$GH_USER" --password-stdin

echo "Building and pushing backend (linux/arm64)..."
docker buildx build --platform linux/arm64 \
  -f apps/backend/Dockerfile \
  -t "$BACKEND_IMAGE" \
  --push .

echo "Building and pushing frontend (linux/arm64)..."
docker buildx build --platform linux/arm64 \
  -f apps/frontend/Dockerfile \
  -t "$FRONTEND_IMAGE" \
  --build-arg VITE_KEYCLOAK_URL="$KEYCLOAK_URL" \
  --build-arg VITE_KEYCLOAK_REALM="$KEYCLOAK_REALM" \
  --build-arg VITE_KEYCLOAK_CLIENT_ID="$KEYCLOAK_CLIENT_ID" \
  --push .

echo ""
echo "Done. Now run this on the Pi to deploy:"
echo ""
echo "  BACKEND_IMAGE=${BACKEND_IMAGE} \\"
echo "  FRONTEND_IMAGE=${FRONTEND_IMAGE} \\"
echo "  GH_USER=${GH_USER} \\"
echo "  CR_PAT='<token>' \\"
echo "  bash scripts/deploy-k3s.sh"
