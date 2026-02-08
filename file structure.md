# FCIT CMP — Production Monorepo File Structure

> Target: ARM64 k3s cluster on 5× Raspberry Pi 5 nodes
> Stack: React + Vite, Node.js + Express, SQLite, Keycloak (OIDC), Nginx Ingress, Cloudflare DNS

```
fcit-cmp/
├── apps/
│   ├── frontend/                        # React + Vite + TypeScript SPA
│   │   ├── public/
│   │   │   └── favicon.ico
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/                  # Radix + neobrutalism.dev base components
│   │   │   │   └── ...                  # Domain components (charts, modals, etc.)
│   │   │   ├── config/
│   │   │   │   └── keycloak.ts          # Keycloak-js client config
│   │   │   ├── contexts/
│   │   │   │   ├── AuthContext.tsx      # Keycloak auth context (replaces mock)
│   │   │   │   ├── LanguageContext.tsx
│   │   │   │   └── ThemeContext.tsx
│   │   │   ├── hooks/
│   │   │   ├── i18n/
│   │   │   │   ├── config.ts
│   │   │   │   └── locales/
│   │   │   │       ├── en/
│   │   │   │       └── ar/
│   │   │   ├── lib/
│   │   │   │   └── utils.ts
│   │   │   ├── routes/
│   │   │   ├── styles/
│   │   │   │   └── base.css
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── nginx.conf                   # Nginx config for SPA routing inside container
│   │   ├── Dockerfile                   # Multi-stage ARM64 build → nginx:alpine
│   │   ├── .dockerignore
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   └── package.json
│   │
│   └── backend/                         # Node.js + Express REST API
│       ├── src/
│       │   ├── config/
│       │   │   ├── database.ts          # better-sqlite3 connection setup
│       │   │   ├── keycloak.ts          # keycloak-connect config
│       │   │   └── env.ts               # Typed env variable loader
│       │   ├── controllers/
│       │   │   ├── users.controller.ts
│       │   │   ├── clubs.controller.ts
│       │   │   ├── events.controller.ts
│       │   │   ├── attendance.controller.ts
│       │   │   ├── achievements.controller.ts
│       │   │   ├── kpi.controller.ts
│       │   │   ├── notifications.controller.ts
│       │   │   └── admin.controller.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts              # JWT validation via Keycloak
│       │   │   ├── roles.ts             # RBAC middleware
│       │   │   ├── validate.ts          # Request validation (express-validator)
│       │   │   └── errorHandler.ts
│       │   ├── models/                  # SQLite table definitions / query helpers
│       │   │   ├── user.model.ts
│       │   │   ├── club.model.ts
│       │   │   ├── event.model.ts
│       │   │   ├── registration.model.ts
│       │   │   ├── attendance.model.ts
│       │   │   ├── achievement.model.ts
│       │   │   ├── kpi.model.ts
│       │   │   ├── notification.model.ts
│       │   │   ├── semester.model.ts
│       │   │   └── auditLog.model.ts
│       │   ├── routes/
│       │   │   ├── users.routes.ts
│       │   │   ├── clubs.routes.ts
│       │   │   ├── events.routes.ts
│       │   │   ├── attendance.routes.ts
│       │   │   ├── achievements.routes.ts
│       │   │   ├── kpi.routes.ts
│       │   │   ├── notifications.routes.ts
│       │   │   └── admin.routes.ts
│       │   ├── services/
│       │   │   ├── qrcode.service.ts    # QR code generation (qrcode lib)
│       │   │   ├── pdf.service.ts       # PDF generation (pdfkit, ARM64-safe)
│       │   │   ├── email.service.ts     # Notification emails (optional)
│       │   │   └── audit.service.ts     # Audit log writes
│       │   ├── utils/
│       │   │   └── logger.ts            # Winston logger
│       │   └── app.ts                   # Express app setup
│       ├── migrations/                  # SQL migration scripts (ordered)
│       │   ├── 001_create_users.sql
│       │   ├── 002_create_clubs.sql
│       │   ├── 003_create_events.sql
│       │   ├── 004_create_registrations.sql
│       │   ├── 005_create_attendance.sql
│       │   ├── 006_create_achievements.sql
│       │   ├── 007_create_kpi_metrics.sql
│       │   ├── 008_create_notifications.sql
│       │   ├── 009_create_semesters.sql
│       │   └── 010_create_audit_logs.sql
│       ├── seeds/                       # Dev/test seed data
│       │   ├── users.seed.ts
│       │   ├── clubs.seed.ts
│       │   └── events.seed.ts
│       ├── tests/
│       │   ├── unit/
│       │   └── integration/
│       ├── Dockerfile                   # Multi-stage ARM64 build → node:20-alpine
│       ├── .dockerignore
│       ├── .env.example
│       ├── tsconfig.json
│       └── package.json
│
├── infra/                               # All infrastructure-as-code
│   ├── docker/
│   │   └── docker-compose.yml           # Local full-stack dev environment
│   │
│   ├── keycloak/
│   │   ├── Dockerfile                   # Custom Keycloak image if needed (ARM64)
│   │   └── realm-export.json            # CMP realm config (exported from admin UI)
│   │
│   └── k8s/                             # Kubernetes manifests for k3s
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secrets.yaml                 # ← never commit real secrets; use sealed-secrets or SOPS
│       ├── storage/
│       │   ├── sqlite-pvc.yaml
│       │   └── keycloak-pvc.yaml
│       ├── backend/
│       │   ├── deployment.yaml
│       │   └── service.yaml
│       ├── frontend/
│       │   ├── deployment.yaml
│       │   └── service.yaml
│       ├── keycloak/
│       │   ├── statefulset.yaml
│       │   └── service.yaml
│       ├── ingress/
│       │   ├── ingress.yaml             # Nginx Ingress rules for all hostnames
│       │   └── cluster-issuer.yaml      # cert-manager Let's Encrypt issuer
│       ├── monitoring/
│       │   ├── prometheus.yaml
│       │   └── grafana.yaml
│       └── cronjobs/
│           └── db-backup.yaml
│
├── docs/                                # Project documentation (from prototype)
│   ├── architecture.md
│   ├── api.md                           # OpenAPI / endpoint reference
│   ├── database-schema.md
│   ├── deployment-guide.md
│   ├── keycloak-setup.md
│   └── runbook.md
│
├── scripts/                             # Helper shell scripts
│   ├── build-arm64.sh                   # docker buildx for ARM64 images
│   ├── push-images.sh
│   ├── migrate.sh                       # Run DB migrations via kubectl exec
│   └── backup-db.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml                       # Lint, test, build on PR
│       └── deploy.yml                   # Build & push ARM64 images on merge to main
│
├── .gitignore
├── README.md                            # → points to docs/
└── package.json                         # Monorepo root (workspaces: ["apps/*"])
```

## Notes

- **ARM64 builds**: Use `docker buildx build --platform linux/arm64` for all images. Both `node:20-alpine` and `nginx:alpine` ship ARM64 variants.
- **SQLite concurrency**: Backend pods must use `ReadWriteOnce` PVC so only one replica writes at a time. Scale reads behind a connection pool.
- **Secrets**: Never commit real values to `k8s/secrets.yaml`. Use [Sealed Secrets](https://sealed-secrets.netlify.app/) or SOPS + age to encrypt at rest in git.
- **Keycloak**: Deploy as a `StatefulSet` with its own PVC. Import `realm-export.json` on first boot.
- **Cloudflare Tunnel** (`cloudflared`) removes the need for open ports on the home router — run it as a systemd service on the k3s master or as a Kubernetes Deployment.
- **Monorepo workspace**: Root `package.json` uses npm/pnpm workspaces (`"workspaces": ["apps/*"]`) so shared tooling (ESLint, Prettier, TypeScript base config) can be hoisted.
