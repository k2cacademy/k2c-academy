INSERT INTO public.app_settings (key, value) VALUES
  ('student_verification_code', 'K2Ç-STUDENT'),
  ('student_access_code', 'K2Ç-STUDENT')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();