ALTER TABLE events ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'physical' CHECK (delivery_mode IN ('physical', 'online'));
