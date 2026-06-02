# Student Portal Complete Fix & Upgrade — Plan

## ⚠ Blockers I need answered before I start

1. **GEMINI_API_KEY is not configured.** Your spec says "use Groq first then Gemini as fallback" everywhere, but only `GROQ_API_KEY` exists in secrets. I'll need to add it via the secret tool. Confirm you want Gemini added (vs. keeping Groq-only with a friendly fallback message — which already works).
2. **About "the root cause of the portal breaking" — `getProfile(session)` vs `getProfile({ data: { session } })`.** That diagnosis is incorrect for the current code. `student-portal.functions.ts` was already refactored to thin `fetch()` wrappers that accept a plain string — calling `getProfile(session)` is the correct pattern. The `{ data: ... }` shape only applies to `createServerFn` wrappers (we removed those). If the portal is broken in a specific way (specific click → specific error), tell me what you saw — otherwise I'll skip this "fix" because it would actually break it.
3. **Voice minutes — your spec contradicts what's live.**
   - Spec: Free **10/month**, Inner Circle **100/month**, Premium **250/month**.
   - Live code: Free **3/day**, Inner Circle **10/day**, no Premium tier.
   - Confirm switching to **monthly** quotas + adding **Premium**. This is a schema + reset-cron change.
4. **`progress_tracker` table doesn't exist.** I'll create it with the 7 milestones (Skill Identified → First Sale Made). Confirm.
5. **`subscription_plan` and `stage` columns don't exist on `student_profiles`.** I'll add `subscription_plan text default 'free'` and `stage text default 'seedling'`. Confirm.
6. **Flutterwave subscription upgrades.** Currently Monnify is wired for minute top-ups. You want Flutterwave inline checkout for plan upgrades — different flow, different webhook. I'll add a new `flutterwave-webhook` route + Flutterwave init action. Confirm.
7. **VAPI integration is brand new** — not in the codebase today. I'll add `@vapi-ai/web`, build a rotation client, and silently fall through 5 publicKey/assistantId pairs before LiveKit dispatch.

## Phase A — Schema & secrets (one migration)

- Add columns to `student_profiles`: `subscription_plan text default 'free'`, `stage text default 'seedling'`, `monthly_minutes_used int default 0`, `monthly_minutes_reset_date date default now()`.
- Create `progress_tracker (id, user_id, milestone, completed, completed_at)` with RLS + GRANTs.
- Add `GEMINI_API_KEY` secret (via secret tool — requires your input).

## Phase B — Server-side fixes

- `student-portal.ts`: replace daily 3/10 quota with monthly 10/100/250 by plan; add `get-dashboard` plan/stage/minutes; add `update-milestone`, `flutterwave-init`, `flutterwave-verify` actions.
- Add Gemini fallback after Groq in `send-coach-message` and `ask-nathy`.
- `ask-nathy.ts`: confirm no `callLovable` references remain (grep — already clean per last edits, will verify).
- `lead-magnet.functions.ts`: build PDF URL from `process.env.SITE_URL` only; server-side fetch + attach to Resend.

## Phase C — Frontend rebuild (CoachChat → StudentPortalApp)

- New shell with bottom nav: **Home / Chat / Voice / Progress / Account**.
- **Home**: welcome + plan badge + minutes left + stage tracker (6 stages, current highlighted) + 5 quick-action buttons.
- **Chat**: existing CoachChat moved into a tab (keep behavior, drop the embedded dashboard widget — Home owns that now).
- **Voice**: new `VapiCall` component with rotation chain + LiveKit fallback, ringtone `/From Knowledge to Cash.mp3`, mute + end buttons, live minute counter.
- **Progress**: 7-milestone checklist with check toggles → `update-milestone`.
- **Account**: current plan + 3 upgrade cards (Free/Inner/Premium) + Flutterwave inline checkout button using public key `FLWPUBK-8c54...-X`.

## Phase D — VAPI rotation client

- New `src/lib/vapi-rotation.ts` holding the 5 (publicKey, assistantId) pairs.
- `startCallWithRotation()`: try pair 1 → on `error`/`call-end` before connected → silently destroy and try pair 2 → … → after pair 5 fails, call existing `livekit-token` + `livekit-dispatch` endpoints.
- All transitions invisible to user (single "Connecting…" UI state).

## Phase E — Polish

- Keep ringtone file path verified (will check `public/`).
- Keep homepage, Navbar, Hero, About, Programs, Team, Results, LeadMagnet, FAQ, Enroll, Footer, ShareWinModal, Notifications, styles.css, `_authenticated/portal` **untouched**.

## What I will NOT touch

Per your spec: homepage, all `src/components/site/*`, `ShareWinModal`, `Notifications`, `styles.css`, `/portal` authenticated route.

## How I'll deliver

I'll do this in 2 turns:
- **Turn 1**: Phase A migration + secret request. Wait for approval/secret.
- **Turn 2**: All code changes (Phases B–E) in one shot, then verify via build + a quick console-log sanity check.

---

**Please answer the 7 blockers above (especially #1, #2, #3, #6) and I'll start with the migration.**