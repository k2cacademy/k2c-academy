
-- 1. Add new columns to student_profiles for plan/stage/monthly minutes
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'seedling',
  ADD COLUMN IF NOT EXISTS monthly_minutes_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_minutes_reset_date date NOT NULL DEFAULT (now())::date;

-- 2. Constrain plan + stage to known values
ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_subscription_plan_check;
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_subscription_plan_check
  CHECK (subscription_plan IN ('free','inner_circle','premium'));

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_stage_check;
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_stage_check
  CHECK (stage IN ('seedling','sprout','grower','closer','winner','ambassador'));

-- 3. progress_tracker table
CREATE TABLE IF NOT EXISTS public.progress_tracker (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  milestone text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_tracker TO authenticated;
GRANT ALL ON public.progress_tracker TO service_role;

ALTER TABLE public.progress_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own progress"
  ON public.progress_tracker FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students insert own progress"
  ON public.progress_tracker FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own progress"
  ON public.progress_tracker FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all progress"
  ON public.progress_tracker FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_progress_tracker_updated_at
  BEFORE UPDATE ON public.progress_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Backfill plan from existing inner_circle_status
UPDATE public.student_profiles
  SET subscription_plan = 'inner_circle'
  WHERE inner_circle_status = 'active' AND subscription_plan = 'free';
