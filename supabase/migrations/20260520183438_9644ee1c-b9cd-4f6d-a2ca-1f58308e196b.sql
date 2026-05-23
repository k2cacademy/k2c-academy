
-- 1. Extend student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS birthday_md text;

-- 2. Chat history for student AI coach
CREATE TABLE IF NOT EXISTS public.student_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_chat_user_created
  ON public.student_chat_messages (user_id, created_at);
ALTER TABLE public.student_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own chat" ON public.student_chat_messages;
CREATE POLICY "Students read own chat" ON public.student_chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students insert own chat" ON public.student_chat_messages;
CREATE POLICY "Students insert own chat" ON public.student_chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Allow students to insert/update their own voice call log rows
DROP POLICY IF EXISTS "Students insert own calls" ON public.voice_call_log;
CREATE POLICY "Students insert own calls" ON public.voice_call_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students update own calls" ON public.voice_call_log;
CREATE POLICY "Students update own calls" ON public.voice_call_log
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. Seed app settings (idempotent)
INSERT INTO public.app_settings (key, value) VALUES
  ('student_access_code', 'K2Ç-STUDENT'),
  ('daily_free_minutes', '5'),
  ('inner_circle_monthly_ngn', '1000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
