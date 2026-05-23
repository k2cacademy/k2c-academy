
-- Drop old livekit_sessions (replaced by voice_call_log)
DROP TABLE IF EXISTS public.livekit_sessions CASCADE;

-- Extend student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS trial_start date,
  ADD COLUMN IF NOT EXISTS trial_end date,
  ADD COLUMN IF NOT EXISTS inner_circle_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS inner_circle_start timestamptz,
  ADD COLUMN IF NOT EXISTS inner_circle_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS daily_free_minutes_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_free_minutes_reset_date date NOT NULL DEFAULT (now()::date),
  ADD COLUMN IF NOT EXISTS purchased_minutes_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_ambassador boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secret_code_role text;

-- voice_call_log
CREATE TABLE IF NOT EXISTS public.voice_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  minutes_used integer NOT NULL DEFAULT 0,
  was_free boolean NOT NULL DEFAULT true,
  amount_paid_ngn integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'initiated',
  livekit_room text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_call_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own calls" ON public.voice_call_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all calls" ON public.voice_call_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- recharge_history
CREATE TABLE IF NOT EXISTS public.recharge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_name text NOT NULL,
  amount_ngn integer NOT NULL,
  minutes_added integer NOT NULL,
  flutterwave_reference text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recharge_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own recharges" ON public.recharge_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all recharges" ON public.recharge_history
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- book_edits
CREATE TABLE IF NOT EXISTS public.book_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode_used text NOT NULL,
  original_word_count integer NOT NULL DEFAULT 0,
  edited_word_count integer NOT NULL DEFAULT 0,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.book_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own edits" ON public.book_edits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all edits" ON public.book_edits
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- flutterwave_webhooks
CREATE TABLE IF NOT EXISTS public.flutterwave_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payment_reference text,
  amount_ngn integer,
  customer_email text,
  status text,
  raw_payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flutterwave_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhooks" ON public.flutterwave_webhooks
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- brand_ambassadors (separate from referral 'ambassadors' table)
CREATE TABLE IF NOT EXISTS public.brand_ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone_number text NOT NULL,
  network text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage brand ambassadors" ON public.brand_ambassadors
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.brand_ambassadors (full_name, phone_number, network, role) VALUES
  ('Dornu Esther', '08055033240', 'Glo', 'Ads Manager'),
  ('Eyong Goodnews', '09131103682', 'MTN', 'Community Manager 2'),
  ('Sunday Obi', '07059391256', 'Glo', 'Social Media Manager'),
  ('Vincent', '07071753752', 'MTN', 'Graphic Designer'),
  ('Louis Ekemini', '08026233453', 'Airtel', 'Ambassador'),
  ('Effa Minka Aliche', '08052062005', 'Glo', 'Community Manager 1'),
  ('Ifeoma', '08062239402', 'MTN', 'Ambassador'),
  ('Ayuk Felix', '08163156939', 'MTN', 'Ambassador'),
  ('Digital Nathy', '09164266235', 'MTN', 'Founder')
ON CONFLICT DO NOTHING;

-- ambassador_data_log
CREATE TABLE IF NOT EXISTS public.ambassador_data_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES public.brand_ambassadors(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  network text NOT NULL,
  amount_mb integer NOT NULL,
  status text NOT NULL,
  api_response jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ambassador_data_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ambassador log" ON public.ambassador_data_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed app_settings
INSERT INTO public.app_settings (key, value) VALUES
  ('student_access_code', 'K2Ç-STUDENT'),
  ('ambassador_access_code', 'K2Ç-AMBASSADOR'),
  ('daily_free_minutes', '5'),
  ('recharge_100_minutes', '5'),
  ('recharge_300_minutes', '20'),
  ('recharge_500_minutes', '45'),
  ('trial_duration_days', '14'),
  ('inner_circle_price_ngn', '1000'),
  ('inner_circle_whatsapp', 'https://chat.whatsapp.com/CUYs5UNfPNBIhVZkP9N6yA'),
  ('whatsapp_channel', 'https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y'),
  ('partners_whatsapp', 'https://chat.whatsapp.com/GqsfcCpqr4cLMOmD0ClS7S'),
  ('sunday_class_whatsapp', 'https://chat.whatsapp.com/CrNR2l6QeOq5dqkLk7jlKf'),
  ('support_whatsapp_number', '2349164266235'),
  ('founding_coupon_code', 'FOUNDING20'),
  ('founding_coupon_discount_pct', '20'),
  ('course_checkout_url', 'https://oniahemmanuel.systeme.io/da36229f'),
  ('admin_email', 'k2cacademy001@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Keep-alive: pure SQL pg_cron job (every 3 days at 12:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keep-alive-ping') THEN
    PERFORM cron.unschedule('keep-alive-ping');
  END IF;
END $$;

SELECT cron.schedule(
  'keep-alive-ping',
  '0 12 */3 * *',
  $$
  INSERT INTO public.keep_alive (pinged_at) VALUES (now());
  DELETE FROM public.keep_alive WHERE pinged_at < now() - interval '7 days';
  $$
);

-- Trigger once now so today is covered
INSERT INTO public.keep_alive (pinged_at) VALUES (now());
