-- Create public storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Create branding folder policy
CREATE POLICY "Allow public read access to branding files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'branding');

-- Allow authenticated admins to upload branding files
CREATE POLICY "Allow admin upload to branding folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'branding'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow authenticated admins to update branding files
CREATE POLICY "Allow admin update to branding folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'branding'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow authenticated admins to delete branding files
CREATE POLICY "Allow admin delete from branding folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'branding'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
