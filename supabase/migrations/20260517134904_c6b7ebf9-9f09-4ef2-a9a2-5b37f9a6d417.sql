
-- Keep-alive
CREATE TABLE public.keep_alive (
  id BIGSERIAL PRIMARY KEY,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pings" ON public.keep_alive FOR SELECT USING (true);

-- Payment verifications
CREATE TABLE public.payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  network TEXT,
  payment_type TEXT NOT NULL,
  expected_amount_ngn INTEGER NOT NULL,
  receipt_url TEXT NOT NULL,
  transaction_reference TEXT,
  ai_confidence INTEGER NOT NULL DEFAULT 0,
  ai_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pv_tx_ref ON public.payment_verifications (transaction_reference) WHERE transaction_reference IS NOT NULL;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their verifications" ON public.payment_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all verifications" ON public.payment_verifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update verifications" ON public.payment_verifications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Anyone can upload receipts" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Admins can read receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'::app_role));
