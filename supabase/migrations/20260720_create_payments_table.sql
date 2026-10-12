-- Generic payments table for M-Pesa (Daraja) and future providers
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mpesa',
  transaction_reference TEXT NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  mpesa_receipt_number TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  result_code INTEGER,
  result_desc TEXT,
  raw_callback JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_reference_uidx
  ON public.payments (transaction_reference);

CREATE UNIQUE INDEX IF NOT EXISTS payments_checkout_request_id_uidx
  ON public.payments (checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON public.payments (provider);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments (created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- No direct client inserts/updates; API uses service role
DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;

-- Reuse shared updated_at trigger function when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.payments IS 'Payment transactions (M-Pesa Daraja STK Push and future providers)';
COMMENT ON COLUMN public.payments.transaction_reference IS 'App-generated unique reference sent as AccountReference';
COMMENT ON COLUMN public.payments.raw_callback IS 'Full Safaricom callback payload for debugging/audit';
