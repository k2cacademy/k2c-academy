const BASE = "/api/public/student-portal";

async function post<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json() as T & { error?: string };
  if (!res.ok || (json as { error?: string }).error) {
    throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return json;
}

export type Plan = "free" | "inner_circle" | "premium";





export type Profile = {
  first_name: string | null; full_name: string | null; email: string | null;
  whatsapp: string | null; birthday_md: string | null; network: string | null;
  onboarding_complete: boolean; trial_start: string | null; trial_end: string | null;
  inner_circle_status: string | null;
};

export const verifyAccessCode = (code: string) =>
  post<{ ok: boolean; session?: string }>("verify-code", { code });

export const getProfile = (session: string) =>
  post<Profile | null>("get-profile", { session });

export const completeOnboarding = (data: {
  session: string; first_name: string; email: string;
  whatsapp: string; birthday_md: string; network: string;
}) => post<{ ok: boolean }>("complete-onboarding", data);

export const getChatHistory = (session: string) =>
  post<{ id: string; role: string; content: string; created_at: string }[]>("get-chat-history", { session });

export type MinutesState = {
  free_remaining: number; purchased: number; total_remaining: number;
  plan: Plan; monthly_cap: number; monthly_used: number;
};
export const getMinutesState = (session: string) =>
  post<MinutesState>("get-minutes-state", { session });

export const sendCoachMessage = (data: { session: string; message: string; voice?: boolean }) =>
  post<{ reply: string }>("send-coach-message", data);

export const synthesizeCoachVoice = (data: { session: string; text: string }) =>
  post<{ fallback: boolean; audio_b64?: string; mime?: string }>("synthesize-voice", data);

export const initRecharge = (data: { session: string; amount_ngn: number }) =>
  post<{ checkoutUrl: string; finalAmount: number }>("init-recharge", data);

export const getBookEditorState = (session: string) =>
  post<{ isInnerCircle: boolean; editsUsed: number; editsRemaining: number | null; modes: { id: string; label: string }[] }>("book-editor-state", { session });

export const runBookEditor = (data: { session: string; mode: string; text: string }) =>
  post<{ edited: string; isInnerCircle: boolean; editsUsed: number; editsRemaining: number | null }>("run-book-editor", data);

export type Plan = "free" | "inner_circle" | "premium";

export type DashboardData = {
  first_name: string;
  plan: Plan;
  is_inner_circle: boolean;
  stage: "seedling" | "sprout" | "grower" | "closer" | "winner" | "ambassador";
  day_n: number;
  days_left: number | null;
  trial_expiring_soon: boolean;
  minutes_free_remaining: number;
  minutes_purchased: number;
  monthly_cap: number;
  monthly_used: number;
  streak_current: number;
  streak_longest: number;
  streak_active_today: boolean;
  modules_completed: number;
  modules_total: number;
  last_action_step: string | null;
  last_session_at: string | null;
};

export const getDashboard = (session: string) =>
  post<DashboardData>("get-dashboard", { session });

export const bumpStreak = (session: string) =>
  post<{ current: number; longest: number }>("bump-streak", { session });

export type Milestone = { milestone: string; completed: boolean; completed_at: string | null };
export const getMilestones = (session: string) =>
  post<{ milestones: Milestone[] }>("get-milestones", { session });
export const updateMilestone = (data: { session: string; milestone: string; completed: boolean }) =>
  post<{ ok: boolean }>("update-milestone", data);

export type FlutterwaveInit = {
  publicKey: string; amount: number; currency: "NGN"; tx_ref: string;
  plan: Plan; customer: { email: string; name: string; phone_number: string };
  meta: { user_id: string; plan: Plan };
};
export const flutterwaveInit = (data: { session: string; plan: Plan }) =>
  post<FlutterwaveInit>("flutterwave-init", data);
export const flutterwaveVerify = (data: { session: string; transaction_id: string; plan: Plan }) =>
  post<{ ok: boolean; plan: Plan }>("flutterwave-verify", data);

export const recordVoiceMinutes = (data: { session: string; seconds: number }) =>
  post<{ ok: boolean }>("record-voice-minutes", data);


