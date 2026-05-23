-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Voice calls
CREATE TABLE public.voice_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  vapi_call_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  was_free boolean NOT NULL DEFAULT false,
  free_minutes_used integer NOT NULL DEFAULT 0,
  paid_amount_ngn integer NOT NULL DEFAULT 0,
  paystack_reference text,
  paystack_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own calls" ON public.voice_call_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all calls" ON public.voice_call_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Ambassadors
CREATE TABLE public.ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  total_referrals integer NOT NULL DEFAULT 0,
  total_paid_referrals integer NOT NULL DEFAULT 0,
  total_earned_ngn integer NOT NULL DEFAULT 0,
  total_paid_out_ngn integer NOT NULL DEFAULT 0,
  paystack_recipient_code text,
  bank_account_number text,
  bank_code text,
  account_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors view themselves" ON public.ambassadors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Ambassadors update their own bank info" ON public.ambassadors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ambassadors" ON public.ambassadors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ambassadors_updated_at
  BEFORE UPDATE ON public.ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ambassador_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_ngn integer NOT NULL DEFAULT 2000,
  paid_qualifying_event text,
  qualified_at timestamptz,
  payout_status text NOT NULL DEFAULT 'pending',
  paystack_transfer_ref text,
  paid_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

ALTER TABLE public.ambassador_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors view their own referrals" ON public.ambassador_referrals
  FOR SELECT TO authenticated USING (auth.uid() = ambassador_user_id);

CREATE POLICY "Admins view all referrals" ON public.ambassador_referrals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Budget ledger
CREATE TABLE public.budget_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  amount_ngn integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  related_user_id uuid,
  related_ref text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  spent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ledger" ON public.budget_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update ledger" ON public.budget_ledger
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter log
CREATE TABLE public.newsletter_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_html text NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL DEFAULT 'cron'
);

ALTER TABLE public.newsletter_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view newsletter log" ON public.newsletter_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Helper: link referral on signup via raw_user_meta_data.referral_code
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_amb_user uuid;
BEGIN
  v_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_code IS NULL OR length(v_code) = 0 THEN RETURN NEW; END IF;

  SELECT user_id INTO v_amb_user FROM public.ambassadors WHERE referral_code = v_code;
  IF v_amb_user IS NULL OR v_amb_user = NEW.id THEN RETURN NEW; END IF;

  INSERT INTO public.ambassador_referrals (ambassador_user_id, referred_user_id)
  VALUES (v_amb_user, NEW.id)
  ON CONFLICT (referred_user_id) DO NOTHING;

  UPDATE public.ambassadors
    SET total_referrals = total_referrals + 1
    WHERE user_id = v_amb_user;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_signup();