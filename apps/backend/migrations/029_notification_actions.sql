-- Add actionable metadata to notifications (JSON blob with action definitions)
ALTER TABLE notifications ADD COLUMN actions_json TEXT;
