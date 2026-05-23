
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  whatsapp TEXT,
  phone_number TEXT,
  network TEXT,
  birthday DATE,
  is_inner_circle BOOLEAN NOT NULL DEFAULT false,
  free_minutes_used INTEGER NOT NULL DEFAULT 0,
  free_minutes_reset_date DATE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month')::date,
  first_sale_made BOOLEAN NOT NULL DEFAULT false,
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own profile" ON public.student_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students insert their own profile" ON public.student_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students update their own profile" ON public.student_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own certificates" ON public.certificates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.birthday_data_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  network TEXT NOT NULL,
  amount_mb INTEGER NOT NULL,
  status TEXT NOT NULL,
  api_response JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int
);

CREATE UNIQUE INDEX birthday_data_log_user_year ON public.birthday_data_log (user_id, sent_year);

ALTER TABLE public.birthday_data_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own birthday gifts" ON public.birthday_data_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.student_profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Certificates publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');
CREATE POLICY "Service can write certificates" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates');
