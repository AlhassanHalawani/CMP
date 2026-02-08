# FCIT Clubs Management Platform (CMP)

A full-stack web application that unifies all club operations for the Faculty of Computing and Information Technology (FCIT) at King Abdulaziz University (KAU) — event management, QR-based attendance, KPI dashboards, and verifiable achievement reports.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Design system | Neobrutalism (Radix UI primitives) |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (via better-sqlite3) |
| Auth | Keycloak (OpenID Connect / OIDC) |
| Container runtime | Docker (ARM64 images) |
| Orchestration | k3s on 5× Raspberry Pi 5 |
| Ingress | Nginx Ingress Controller |
| DNS / proxy | Cloudflare DNS + optional Tunnel |
| i18n | i18next — English & Arabic (RTL) |

---

## Monorepo layout

```
fcit-cmp/
├── apps/
│   ├── frontend/    # React SPA
│   └── backend/     # Express REST API
├── infra/
│   ├── docker/      # docker-compose (local dev)
│   ├── keycloak/    # realm config
│   └── k8s/         # Kubernetes manifests
├── docs/
└── scripts/
```

See [file structure.md](./file%20structure.md) for the full annotated tree.

---

## Prerequisites

- Node.js 20+
- Docker with `buildx` (for ARM64 cross-builds)
- `kubectl` pointed at your k3s cluster
- A Cloudflare account (for DNS / tunnel)

---

## Local development

```bash
# Clone
git clone https://github.com/<your-org>/fcit-cmp.git
cd fcit-cmp

# Install all workspace deps
npm install

# Start full stack (frontend + backend + keycloak)
docker compose -f infra/docker/docker-compose.yml up
```

The frontend dev server runs on `http://localhost:5173`, the API on `http://localhost:3000`, and Keycloak on `http://localhost:8080`.

---

## Environment variables

Copy `apps/backend/.env.example` to `apps/backend/.env` and fill in the values:

```
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/cmp.db
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=cmp
KEYCLOAK_CLIENT_ID=cmp-app
KEYCLOAK_CLIENT_SECRET=<from keycloak admin>
JWT_SECRET=<random secret>
```

---

## Database migrations

```bash
cd apps/backend
npm run migrate      # run all pending migrations
npm run seed         # (optional) seed development data
```

---

## Building ARM64 images

```bash
bash scripts/build-arm64.sh      # builds frontend + backend for linux/arm64
bash scripts/push-images.sh      # pushes to container registry
```

---

## Deploying to k3s

```bash
# Apply manifests in order
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/secrets.yaml        # use sealed-secrets in production
kubectl apply -f infra/k8s/storage/
kubectl apply -f infra/k8s/keycloak/
kubectl apply -f infra/k8s/backend/
kubectl apply -f infra/k8s/frontend/
kubectl apply -f infra/k8s/ingress/
```

Run migrations after the backend pod is up:

```bash
kubectl exec -it deploy/cmp-backend -n cmp-prod -- npm run migrate
```

---

## User roles

| Role | Description |
|---|---|
| `student` | Browse events, register, view QR attendance, download achievement reports |
| `club-lead` | Create/manage club events, approve members, scan attendance QR |
| `supervisor` | Approve/reject events, view KPI dashboards and club rankings |
| `admin` | Full system access — clubs, semesters, users, audit logs |

---

## Key features

- Event lifecycle: Draft → Submitted → Approved / Rejected
- QR code attendance check-in per event
- Per-semester achievement reports (PDF with QR verification)
- KPI dashboards and club leaderboards
- Full Arabic / English bilingual support with RTL layout
- Dark / light theme

---

## Docs

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Database schema](docs/database-schema.md)
- [Deployment guide](docs/deployment-guide.md)
- [Keycloak setup](docs/keycloak-setup.md)
- [Runbook](docs/runbook.md)

---

## License

MIT
