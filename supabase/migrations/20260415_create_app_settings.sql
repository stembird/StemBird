-- App-wide feature flag settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default: WhatsApp enabled
INSERT INTO app_settings (key, value)
VALUES ('whatsapp_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Public read (so the floating button can check without auth)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app_settings"
  ON app_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
