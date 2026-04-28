ALTER TABLE memberships ADD COLUMN primary_role TEXT;
ALTER TABLE memberships ADD COLUMN role_notes TEXT;
ALTER TABLE memberships ADD COLUMN approved_at TEXT;
ALTER TABLE memberships ADD COLUMN approved_by INTEGER REFERENCES users(id);
