// All server functions replaced with direct fetch calls to /api/public/student-portal

const BASE = "/api/public/student-portal";

async function post<T>(action: string, data: Record<string, unknown>): Promise<T> {
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

export const verifyAccessCode = (code: string) =>
  post<{ ok: boolean; session?: string }>("verify-code", { code });

export const getProfile = (session: string) =>
  post<{ 
    first_name: string | null; full_name: string | null; email: string | null;
    whatsapp: string | null; birthday_md: string | null; network: string | null;
    onboarding_complete: boolean; trial_start: string | null; trial_end: string | null;
    inner_circle_status: string | null;
  } | null>("get-profile", { session });

export const completeOnboarding = (data: {
  session: string; first_name: string; email: string;
  whatsapp: string; birthday_md: string; network: string;
}) => post<{ ok: boolean }>("complete-onboarding", data);

export const sendCoachMessage = (data: {
  session: string; message: string; voice?: boolean;
}) => post<{ reply: string }>("send-coach-message", data);

export const synthesizeCoachVoice = (data: { session: string; text: string }) =>
  post<{ fallback: boolean; audio_b64?: string; mime?: string }>("synthesize-voice", data);
