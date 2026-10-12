-- Daily meter for Career Tools AI suggestions (rewrite summary, bullets, skills, letter paragraphs).

CREATE TABLE IF NOT EXISTS career_tools_ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_career_tools_ai_usage_date
  ON career_tools_ai_usage(usage_date);

ALTER TABLE career_tools_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS career_tools_ai_usage_select_own ON career_tools_ai_usage;
CREATE POLICY career_tools_ai_usage_select_own
  ON career_tools_ai_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS career_tools_ai_usage_upsert_own ON career_tools_ai_usage;
CREATE POLICY career_tools_ai_usage_upsert_own
  ON career_tools_ai_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE career_tools_ai_usage IS
  'Counts Career Tools /api/career-tools/suggest calls per user per UTC day.';
