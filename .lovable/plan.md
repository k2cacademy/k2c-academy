# K2Ç Academy — 13-System Build Plan

## Critical blockers I need from you first

1. **Telegram bot token** — you said "already in project" but the only secrets stored are `LOVABLE_API_KEY` and Supabase ones. I'll need you to add `TELEGRAM_BOT_TOKEN` via the secrets prompt. I'll request it as soon as you approve this plan.
2. **External "coach brain" Supabase** (`bgnqlrlcadrkubrrbnji.supabase.co`) — I need its **anon key** (and/or service-role key) to call `match_coach_brain`. I'll request `COACH_BRAIN_SUPABASE_ANON_KEY` (+ optionally `COACH_BRAIN_SUPABASE_SERVICE_ROLE_KEY`).
3. **LiveKit credentials you pasted in chat** — I'll move these into secret storage (not code): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Please rotate the secret on LiveKit since it was sent in plain chat.
4. **Systeme.io specifics** — what's the **course ID** for "Zero to First Online Sale System" and the **tag ID** for "K2Ç Student"? (The API needs IDs, not names.)
5. **Resend sender** — keep using `onboarding@resend.dev` for now, or do you have a verified domain?
6. **TidyCal booking URL** — for System 13.
7. **Confirm:** I will **remove** all Paystack and Vapi code paths (ambassador payouts via Paystack, voice calls via Vapi). Ambassador payouts will become "manual / TODO" unless you want a Flutterwave/Monnify replacement now.

---

## Phase A — Foundations (no UI yet)

**A1. Secrets & cleanup**
- Add: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` (= 7115484089), `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `COACH_BRAIN_SUPABASE_URL`, `COACH_BRAIN_SUPABASE_ANON_KEY`, `TIDYCAL_URL`, `SYSTEMEIO_COURSE_ID`, `SYSTEMEIO_STUDENT_TAG_ID`.
- Strip Paystack/Vapi from code & UI.

**A2. Database migrations** (per your spec, additive — keeps existing tables):
- `students_v2` view or extend `student_profiles` with `tags text[]`, `trial_start`, `trial_expiry`, `status`.
- `payments` (links to existing `payment_verifications`, adds `receipt_hash`).
- `events` (student_email, event_type, module_name, ts WAT).
- `coach_sessions` (date, duration, mood, action_step, summary).
- `streaks` (current, longest, last_active).
- `telegram_actions` log (for APPROVE/REJECT audit).
- `systemeio_events` (raw webhook payloads).
- Unique index on `payments.receipt_hash` for duplicate detection.
- All RLS: student sees own rows; admin sees all.

---

## Phase B — Payment & approval pipeline (Systems 1, 2, 7, 9)

**B1. Receipt verification (System 2)** — upgrade existing `verifyPayment` server fn:
- Hash receipt bytes (sha256) → store in `payments.receipt_hash` → reject duplicates with friendly message.
- Stream live status to the client ("Reading…", "Amount confirmed", "Submitted for approval") via progressive server-fn calls.
- Gemini Vision already wired; just tighten amount-match logic for Course/Inner Circle/Top-up.

**B2. Telegram Command Center (System 1)**:
- New server fn `notifyTelegramPayment` posts message + photo + inline keyboard (APPROVE/REJECT) with `callback_data = approve:<verification_id>` / `reject:<verification_id>`.
- New public route `/api/public/hooks/telegram-webhook` — verifies `X-Telegram-Bot-Api-Secret-Token`, parses callback, dispatches to approve/reject handler.
- Approve handler: marks verification verified → upserts student → calls Systeme.io enroll + tag → sets `trial_start = now()`, `trial_expiry = now() + 14d` → sends Resend welcome email → posts confirmation to Telegram → enables success screen for student.
- Reject handler: marks rejected → sends Resend "couldn't verify" email with WhatsApp link → Telegram confirmation.
- Register webhook URL once from sandbox.

**B3. Systeme.io webhook receiver (System 7)**:
- Public route `/api/public/hooks/systemeio-webhook` — validates signature (you'll paste the webhook secret in Systeme.io UI), stores raw event + parsed fields into `systemeio_events` and `events`.

**B4. Upsell (System 9)**:
- Success screen shows Inner Circle offer card.
- "Yes" → records `inner_circle_status='pending_founding'` + sends Telegram upsell alert.

---

## Phase C — Voice & Brain (Systems 3, 4, 13)

**C1. LiveKit voice (System 3)** — replace existing Vapi flow:
- Server fn `mintLivekitToken` issues a JWT for room `coach-<userId>-<timestamp>`.
- Client uses `@livekit/components-react` to connect, shows duration timer, mute, end-call.
- Railway agent auto-joins (it already listens to the LiveKit cloud).
- Mobile-tested mic permission UX.

**C2. RAG brain (System 4)**:
- Server fn `askCoach` takes user message → embeds (via Lovable AI Gateway embeddings) → calls `match_coach_brain` RPC on the external coach-brain Supabase → injects top chunks into a "Digital Nathy" system prompt → returns answer.
- Replaces current coach-brain string.

**C3. Escalation (System 13)**:
- Track `stuck_count` per session; after 2 consecutive "stuck" or 14 days no progress → coach reply includes TidyCal link + fires Telegram alert.

---

## Phase D — Student dashboard & engagement (Systems 10, 11, 5 partial)

**D1. Dashboard (System 10)** — new component in `_authenticated/portal`:
- Welcome, current goal, module X of 6, day-N counter, today's coach minutes remaining, "next step from last session" pulled from latest `coach_sessions.action_step`.
- CTAs: TALK TO COACH / CONTINUE COURSE.

**D2. Streaks (System 11)**:
- On login / lesson complete / coach chat → upsert `streaks` (increment if `last_active = today-1`, reset if older).
- Display flame + streak count on dashboard.
- Daily 9pm WAT cron: if `last_active < today` and streak was ≥2 → Resend "don't break your streak" email.

**D3. Per-event Telegram alerts (System 5)**:
- Hooks in: payment approve, module complete (from Systeme.io webhook), course complete, trial-expiring-in-2d (daily cron), inactive-7d (daily cron — includes "Message on WhatsApp" button).

---

## Phase E — Reporting & analytics (Systems 6, 8, 12)

**E1. Daily morning report (System 6)** — pg_cron 8AM WAT → public route → aggregates → Telegram message.

**E2. Weekly success prediction (System 12)** — pg_cron Mon 8AM WAT → per-student scoring (logins, coach sessions, days since signup) → bucket High/Medium/Low → AT RISK / HIGH POTENTIAL flags → Telegram with WhatsApp deep-link buttons.

**E3. Google Analytics (System 8)** — gtag snippet in `__root.tsx` head with `G-YJ90XMTRGC`.

---

## Technical notes

- All cron jobs use `pg_cron` + `pg_net` hitting `/api/public/hooks/*` (anon-key `apikey` header per Lovable conventions).
- WAT timestamps stored as `timestamptz` (UTC); formatted to `Africa/Lagos` only at the edge (Telegram messages, emails, UI).
- Telegram inline-keyboard callbacks use a derived secret token (sha256 of bot token) — same pattern as the Telegram knowledge file.
- Receipt hash = sha256 of the uploaded file bytes; computed in `verifyPayment` server fn before Gemini call.
- External coach-brain Supabase gets its own browser-safe client at `src/integrations/coach-brain/client.ts`.
- The Lovable AI Gateway covers both chat (`google/gemini-3-flash-preview`) and embeddings (`google/gemini-embedding-001`) — no Groq/Gemini direct keys needed for the coach. Keep `GEMINI_API_KEY` only for receipt Vision (current code).

## Suggested build order (so you can ship in chunks)

1. Phase A (foundations) — ~1 turn.
2. Phase B (payments + Telegram + Systeme + upsell) — biggest user-visible win.
3. Phase E.3 (GA) — trivial drop-in.
4. Phase C (voice + RAG) — once LiveKit secret is rotated.
5. Phase D (dashboard + streaks).
6. Phase E.1 + E.2 (cron reports).

---

## What I need from you to start

Reply with:
- Answers to the 7 blockers above (especially Systeme course/tag IDs + confirmation to drop Paystack/Vapi).
- Approval to begin Phase A (I'll request all required secrets in one prompt right after).
