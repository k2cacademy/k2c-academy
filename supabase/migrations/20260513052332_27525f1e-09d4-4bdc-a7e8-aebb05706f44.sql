
-- Settings table
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

INSERT INTO public.app_settings (key, value) VALUES ('student_verification_code', 'K2Ç-STUDENT');

-- Student results
CREATE TABLE public.student_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  what_they_sell TEXT NOT NULL,
  win_story TEXT NOT NULL,
  sale_amount NUMERIC,
  profile_photo_url TEXT NOT NULL,
  proof_image_url TEXT,
  star_rating INTEGER NOT NULL DEFAULT 5 CHECK (star_rating BETWEEN 1 AND 5),
  is_verified BOOLEAN NOT NULL DEFAULT true,
  date_submitted TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified results"
  ON public.student_results FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Anyone can submit a result"
  ON public.student_results FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.student_results;
ALTER TABLE public.student_results REPLICA IDENTITY FULL;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('student-results', 'student-results', true);

CREATE POLICY "Public read student results bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-results');

CREATE POLICY "Anyone can upload student result media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-results');
