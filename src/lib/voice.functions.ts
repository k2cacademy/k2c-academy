import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// TEMPORARY STUB — full implementation lands in Phase 8 (LiveKit rebuild).
// Old Monnify/livekit_sessions code removed so the project compiles after the
// foundational migration.

export const getVoiceCallStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      freeMinutesRemaining: 5,
      purchasedMinutesBalance: 0,
      activeSession: null as null | { id: string; livekitToken: string; url: string },
    };
  });

export const startVoiceCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error("Voice calls are being upgraded. Available in next deploy.");
  });

export const endVoiceCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { ok: true };
  });
