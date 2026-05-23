
# Student Portal — Phase 1 Build

Scope: only Part 4 of your big brief (Student Portal). I'll leave the existing `/_authenticated/portal`, homepage, Ask Nathy widget, emails, and keep-alive job alone for now — we'll tackle those in later turns.

## 1. Architecture decision (please confirm)

The spec says "no signup, no email login, no password — secret code only." But the existing `student_profiles` table is keyed to `auth.uid()` with RLS that requires an authenticated user. To honour "code-only" without breaking security, I'll do this:

- On correct code entry, sign the visitor in **anonymously** via Supabase Auth (`signInAnonymously`). This gives every device a real `auth.uid` so RLS still works — but the user never sees a signup form. The flag `k2c_student_verified=true` is stored in localStorage so they skip the gate next visit; the anonymous session persists in Supabase's own storage.
- All new data (profile, calls, recharges) is keyed to that anonymous `user_id`. No email/password ever requested.
- Onboarding collects first_name / email / whatsapp / birthday(MM-DD) / network and writes to `student_profiles` with `trial_start = today`, `trial_end = today + 14`.

If you'd rather use a pure "device id in localStorage, no Supabase auth at all" model, say so and I'll switch — but then RLS has to be opened up and security gets weaker.

## 2. Files I'll create

```text
src/routes/student-portal.tsx              # gate + onboarding + main shell
src/components/student/CodeGate.tsx        # premium dark code-entry UI
src/components/student/Onboarding.tsx      # 2-screen welcome + details form
src/components/student/CoachChat.tsx       # chat UI, daily tip banner, action buttons
src/components/student/VoiceInput.tsx      # hold-to-record mic (Web Speech API)
src/components/student/SpeakerButton.tsx   # TTS playback per coach message
src/components/student/CallScreen.tsx      # LiveKit call UI + countdown timer
src/components/student/RechargeModal.tsx   # Monnify top-up modal
src/lib/student-portal.functions.ts        # server fns: verifyCode, completeOnboarding,
                                           #   sendChat (Groq proxy), startCall (LiveKit token),
                                           #   logCall, getMinutesState, initRecharge
```

## 3. DB migration (small, additive)

Add to `student_profiles`:
- `email text`
- `birthday_md text` (stores "MM-DD" so we don't need a year)

Add policies so the anonymous student can `INSERT` and `UPDATE` their own row (current table only allows the existing user-id check on update; insert is allowed — good).

Add new table `student_chat_messages (id, user_id, role, content, created_at)` with RLS = own rows.

The `voice_call_log` table already exists and fits — I'll just add `INSERT` and `UPDATE` policies for the owning user.

## 4. AI coach — Groq

Server function `sendChat` calls `https://api.groq.com/openai/v1/chat/completions` with `GROQ_API_KEY` (already in secrets), model `llama-3.1-8b-instant` (replacement for the deprecated `llama3-8b-8192`), system prompt from your brief. The Customer Service brain vs Coach brain split: since we don't ingest the PDFs yet, I'll embed the key system-prompt facts inline. PDF ingestion (RAG) is a separate task — flag if you want it now.

## 5. Voice features

- **Mic input**: hold-to-record mic button using `window.SpeechRecognition` / `webkitSpeechRecognition`. Auto-language detect via `navigator.language`. Swipe-left to cancel. Mobile-safe.
- **Speaker output**: `window.speechSynthesis` with language picked from a quick heuristic on the message text. Gold icon, red stop icon while playing.
- Graceful fallback if browser lacks support (button hidden + toast).

## 6. LiveKit call

`startCall` server function mints a LiveKit JWT (using `livekit-server-sdk`) with the student's identity, then returns `{ url, token }`. Client connects via `livekit-client`, shows the call screen with a countdown that ticks down from remaining minutes, auto-disconnects at 00:00, opens recharge modal.

Minute deduction order: deplete `daily_free_minutes_used` (cap 5/day, resets via `daily_free_minutes_reset_date`) before `purchased_minutes_balance`. Logged in `voice_call_log`.

The LiveKit **agent** itself (the AI voice on the other side of the room) is a separate worker process. I'll assume your agent ID `CA_ad42h7xUxBtk` is already deployed in LiveKit Cloud and dispatch it on room creation. If it isn't deployed, the room will work but no AI will join — flag if you need help wiring the agent worker.

## 7. Recharge — Monnify

`initRecharge` server function creates a Monnify transaction (₦100/₦300/₦500 → 5/20/45 mins) using `MONNIFY_API_KEY` + `MONNIFY_SECRET_KEY` + `MONNIFY_CONTRACT_CODE`, returns checkout URL. A webhook at `/api/public/monnify-webhook` (already scoped under `api/public`) credits `purchased_minutes_balance` on success.

## 8. Action buttons

Implemented as you specified — modal prompts for objection / script, direct WhatsApp deeplinks for SOS / Talk to Nathy / Inner Circle (groups & numbers from the brief).

## 9. Trial expiry overlay

Computed client-side from `trial_end` + `inner_circle_status`. Shows the "TRIAL ENDED" overlay with the Inner Circle CTA (Monnify ₦1,000/mo subscription link).

## 10. Out of scope for this turn

- Keep-alive cron (Part 1)
- Homepage fixes (Part 2)
- Ask Nathy public widget (Part 3)
- Email rewrites + Resend wiring (Part 2 Fix 4)
- Trial reminder emails (Part 4 Step 7 emails)
- PDF RAG ingestion of the two brain PDFs
- Inner Circle subscription billing/recurrence (only one-off N1,000 link in this pass)

## Confirm

1. **OK to use anonymous Supabase auth** under the hood (recommended) vs pure localStorage-only?
2. **Are you OK with `llama-3.1-8b-instant`** in place of the deprecated `llama3-8b-8192`?
3. **PDF RAG now or later?** (Later is much faster to ship.)

Once you answer, I'll execute the plan in one go.
