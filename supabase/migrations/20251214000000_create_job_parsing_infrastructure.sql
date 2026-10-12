-- Create job parsing queue and caching infrastructure
BEGIN;

-- Job parsing queue table
CREATE TABLE IF NOT EXISTS public.job_parsing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_text TEXT NOT NULL,
  job_text_hash TEXT NOT NULL, -- For deduplication
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB, -- Parsed job data
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- AI response cache table
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT NOT NULL UNIQUE, -- Hash of the input text
  input_text TEXT NOT NULL,
  response_data JSONB NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'), -- Cache for 7 days
  hit_count INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_parsing_queue_status ON public.job_parsing_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_parsing_queue_created_at ON public.job_parsing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_job_parsing_queue_hash ON public.job_parsing_queue(job_text_hash);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hash ON public.ai_response_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires ON public.ai_response_cache(expires_at);

-- Enable RLS
ALTER TABLE public.job_parsing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to manage their parsing jobs
CREATE POLICY "Users can manage parsing queue" 
ON public.job_parsing_queue 
FOR ALL 
USING (true); -- For now, allow all operations

CREATE POLICY "Users can access cache" 
ON public.ai_response_cache 
FOR ALL 
USING (true); -- For now, allow all operations

-- Trigger for updating timestamps
CREATE TRIGGER update_job_parsing_queue_updated_at
BEFORE UPDATE ON public.job_parsing_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create cache entry
CREATE OR REPLACE FUNCTION public.get_cached_response(input_text TEXT)
RETURNS JSONB AS $$
DECLARE
  cache_entry RECORD;
  text_hash TEXT;
BEGIN
  -- Generate hash of input text
  text_hash := encode(digest(input_text, 'sha256'), 'hex');
  
  -- Try to find cached response
  SELECT response_data, id INTO cache_entry
  FROM public.ai_response_cache 
  WHERE input_hash = text_hash 
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    -- Update hit count
    UPDATE public.ai_response_cache 
    SET hit_count = hit_count + 1 
    WHERE id = cache_entry.id;
    
    RETURN cache_entry.response_data;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to save response to cache
CREATE OR REPLACE FUNCTION public.save_to_cache(
  input_text TEXT, 
  response_data JSONB, 
  model_used TEXT DEFAULT 'unknown'
)
RETURNS UUID AS $$
DECLARE
  text_hash TEXT;
  cache_id UUID;
BEGIN
  -- Generate hash of input text
  text_hash := encode(digest(input_text, 'sha256'), 'hex');
  
  -- Insert or update cache entry
  INSERT INTO public.ai_response_cache (input_hash, input_text, response_data, model_used)
  VALUES (text_hash, input_text, response_data, model_used)
  ON CONFLICT (input_hash) DO UPDATE SET
    response_data = EXCLUDED.response_data,
    model_used = EXCLUDED.model_used,
    created_at = now(),
    expires_at = now() + INTERVAL '7 days',
    hit_count = ai_response_cache.hit_count + 1
  RETURNING id INTO cache_id;
  
  RETURN cache_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;