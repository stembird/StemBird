-- ============================================================================
-- Add channel_name to social_posts
--
-- publishToBuffer stores the Buffer channel display name on the post record
-- (channel_name), but the original social publishing migration omitted the
-- column. Without it, updating a post after sending to Buffer fails with
-- "column channel_name does not exist".
-- ============================================================================

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS channel_name TEXT;
