-- Fix RLS policies for app_settings
-- upsert needs both INSERT and UPDATE policies with WITH CHECK

DROP POLICY IF EXISTS "Admins can update app_settings" ON app_settings;

CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert app_settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
