
-- 1. Extend student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- 2. Extend payment_verifications
ALTER TABLE public.payment_verifications
  ADD COLUMN IF NOT EXISTS receipt_sha256 text,
  ADD COLUMN IF NOT EXISTS notified_telegram_at timestamptz,
  ADD COLUMN IF NOT EXISTS telegram_message_id bigint,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_actor text;

CREATE UNIQUE INDEX IF NOT EXISTS payment_verifications_receipt_sha256_uniq
  ON public.payment_verifications(receipt_sha256)
  WHERE receipt_sha256 IS NOT NULL;

-- 3. student_events
CREATE TABLE IF NOT EXISTS public.student_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  student_email text NOT NULL,
  event_type text NOT NULL,
  module_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_events_email_idx ON public.student_events(student_email);
CREATE INDEX IF NOT EXISTS student_events_user_idx ON public.student_events(user_id);
ALTER TABLE public.student_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own events" ON public.student_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all events" ON public.student_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. coach_sessions
CREATE TABLE IF NOT EXISTS public.coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  duration_seconds integer NOT NULL DEFAULT 0,
  mood text,
  action_step text,
  summary text,
  stuck_count integer NOT NULL DEFAULT 0,
  escalated boolean NOT NULL DEFAULT false,
  channel text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_sessions_user_idx ON public.coach_sessions(user_id, created_at DESC);
ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own sessions" ON public.coach_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students insert own sessions" ON public.coach_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.coach_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. streaks
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id uuid PRIMARY KEY,
  student_email text,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own streak" ON public.streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all streaks" ON public.streaks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. telegram_actions
CREATE TABLE IF NOT EXISTS public.telegram_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_id uuid,
  raw_callback jsonb NOT NULL,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view telegram actions" ON public.telegram_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. systemeio_events
CREATE TABLE IF NOT EXISTS public.systemeio_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  student_email text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS systemeio_events_email_idx ON public.systemeio_events(student_email);
ALTER TABLE public.systemeio_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view systemeio events" ON public.systemeio_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. upsells
CREATE TABLE IF NOT EXISTS public.upsells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  student_email text NOT NULL,
  offer text NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  amount_ngn integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own upsells" ON public.upsells FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all upsells" ON public.upsells FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 9. daily_report_log
CREATE TABLE IF NOT EXISTS public.daily_report_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  report_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb,
  UNIQUE(report_type, report_date)
);
ALTER TABLE public.daily_report_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view report log" ON public.daily_report_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
