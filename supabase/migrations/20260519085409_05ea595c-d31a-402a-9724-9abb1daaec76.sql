
-- Drop the old Vapi-based table (fresh start with LiveKit)
DROP TABLE IF EXISTS public.voice_call_sessions CASCADE;

-- New LiveKit in-browser voice call sessions
CREATE TABLE public.livekit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_name text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  was_free boolean NOT NULL DEFAULT false,
  free_minutes_used integer NOT NULL DEFAULT 0,
  paid_amount_ngn integer NOT NULL DEFAULT 0,
  monnify_reference text UNIQUE,
  monnify_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_livekit_sessions_user ON public.livekit_sessions(user_id);
CREATE INDEX idx_livekit_sessions_ref ON public.livekit_sessions(monnify_reference);

ALTER TABLE public.livekit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own sessions"
  ON public.livekit_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sessions"
  ON public.livekit_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
