# FCIT CMP — Database Schema

Database: SQLite (better-sqlite3), WAL mode, foreign keys ON.

Default path: `./data/cmp.db` (configurable via `DATABASE_PATH`).

Migrations are in `apps/backend/migrations/` and run via
`npm run migrate --workspace=apps/backend`.

---

## users

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| keycloak_id | TEXT | UNIQUE, NOT NULL |
| email | TEXT | UNIQUE, NOT NULL |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL, DEFAULT 'student', CHECK IN ('student','club_leader','admin') |
| avatar_url | TEXT | |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Indexes: `idx_users_keycloak_id`, `idx_users_email`.

---

## clubs

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | NOT NULL |
| name_ar | TEXT | NOT NULL |
| description | TEXT | |
| description_ar | TEXT | |
| logo_url | TEXT | |
| leader_id | INTEGER | FK users(id) ON DELETE SET NULL |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Indexes: `idx_clubs_leader_id`.

---

## events

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| club_id | INTEGER | NOT NULL, FK clubs(id) ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| title_ar | TEXT | NOT NULL |
| description | TEXT | |
| description_ar | TEXT | |
| location | TEXT | |
| starts_at | TEXT | NOT NULL |
| ends_at | TEXT | NOT NULL |
| capacity | INTEGER | |
| status | TEXT | NOT NULL, DEFAULT 'draft', CHECK IN ('draft','published','cancelled','completed') |
| created_by | INTEGER | FK users(id) ON DELETE SET NULL |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Indexes: `idx_events_club_id`, `idx_events_starts_at`, `idx_events_status`.

---

## registrations

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| event_id | INTEGER | NOT NULL, FK events(id) ON DELETE CASCADE |
| user_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE |
| status | TEXT | NOT NULL, DEFAULT 'confirmed', CHECK IN ('pending','confirmed','cancelled') |
| registered_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Unique constraint: `(event_id, user_id)`.

Indexes: `idx_registrations_event_id`, `idx_registrations_user_id`.

---

## attendance

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| event_id | INTEGER | NOT NULL, FK events(id) ON DELETE CASCADE |
| user_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE |
| checked_in_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| method | TEXT | NOT NULL, DEFAULT 'qr', CHECK IN ('qr','manual') |
| qr_token | TEXT | |

Unique constraint: `(event_id, user_id)`.

Indexes: `idx_attendance_event_id`, `idx_attendance_user_id`.

---

## achievements

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE |
| club_id | INTEGER | NOT NULL, FK clubs(id) ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| title_ar | TEXT | NOT NULL |
| description | TEXT | |
| description_ar | TEXT | |
| awarded_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| semester_id | INTEGER | |

Indexes: `idx_achievements_user_id`, `idx_achievements_club_id`, `idx_achievements_semester_id`.

---

## kpi_metrics

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| club_id | INTEGER | NOT NULL, FK clubs(id) ON DELETE CASCADE |
| semester_id | INTEGER | |
| metric_key | TEXT | NOT NULL |
| metric_value | REAL | NOT NULL, DEFAULT 0 |
| recorded_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Indexes: `idx_kpi_metrics_club_id`, `idx_kpi_metrics_semester_id`, `idx_kpi_metrics_key`.

---

## notifications

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| body | TEXT | |
| type | TEXT | NOT NULL, DEFAULT 'info', CHECK IN ('info','success','warning','error') |
| is_read | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Indexes: `idx_notifications_user_id`, `idx_notifications_is_read`.

---

## semesters

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | NOT NULL, UNIQUE |
| starts_at | TEXT | NOT NULL |
| ends_at | TEXT | NOT NULL |
| is_active | INTEGER | NOT NULL, DEFAULT 0 |

Indexes: `idx_semesters_is_active`.

---

## audit_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, AUTOINCREMENT |
| actor_id | INTEGER | FK users(id) ON DELETE SET NULL |
| action | TEXT | NOT NULL |
| entity_type | TEXT | NOT NULL |
| entity_id | INTEGER | |
| payload | TEXT | JSON string |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

Indexes: `idx_audit_logs_actor_id`, `idx_audit_logs_entity (entity_type, entity_id)`, `idx_audit_logs_created_at`.

---

## Email Verification — Deferred

No verification-related columns or tables exist yet. Current signup
creates users with `emailVerified: true` in Keycloak. A future
migration will add verification tokens and status tracking when the
email verification feature is implemented.
