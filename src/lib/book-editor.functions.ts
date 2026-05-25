import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MODES: Record<string, { label: string; system: string }> = {
  "professional-polish": {
    label: "Professional Polish",
    system:
      "You are a professional book editor. Polish the user's manuscript for professional publication quality: fix grammar, improve flow, sharpen sentences. Keep the author's original voice. Return only the edited text.",
  },
  "global-standard": {
    label: "Global Standard Edit",
    system:
      "You are an international publishing editor. Edit the text to meet global publishing standards (clarity, structure, formatting, vocabulary). Preserve meaning. Return only the edited text.",
  },
  "nigerian-to-global": {
    label: "Nigerian to Global Voice",
    system:
      "You are an editor specialised in adapting Nigerian English manuscripts to a neutral global English voice that international readers find natural, while preserving authenticity. Return only the edited text.",
  },
  "clarity-simplicity": {
    label: "Clarity and Simplicity",
    system:
      "You are an editor who rewrites text for maximum clarity and simplicity, using plain language without losing depth. Return only the edited text.",
  },
  "full-manuscript-review": {
    label: "Full Manuscript Review",
    system:
      "You are a senior developmental editor. Provide a full manuscript review: first a short structured critique (structure, pacing, voice, clarity, suggested improvements) followed by the revised text. Use clear headings.",
  },
};

export const editBookText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        mode: z.string().min(1),
        text: z.string().min(20).max(60000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const mode = MODES[data.mode];
    if (!mode) throw new Error("Invalid editing mode");

    const userId = context.userId;
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("student_profiles")
      .select("is_inner_circle, book_edits_used")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    const isInner = !!profile?.is_inner_circle;
    const used = (profile?.book_edits_used as number | undefined) ?? 0;
    const TRIAL_LIMIT = 3;
    if (!isInner && used >= TRIAL_LIMIT) {
      throw new Error(
        `Trial limit reached (${TRIAL_LIMIT} edits). Upgrade to Inner Circle for unlimited edits.`,
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        temperature: 0.3,
        messages: [
          { role: "system", content: mode.system },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Groq error", resp.status, t);
      throw new Error(`AI editor failed (${resp.status})`);
    }
    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const edited = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!edited) throw new Error("AI returned empty result");

    await supabaseAdmin
      .from("student_profiles")
      .update({ book_edits_used: used + 1 })
      .eq("user_id", userId);

    const newUsed = used + 1;
    return {
      edited,
      modeLabel: mode.label,
      isInnerCircle: isInner,
      editsUsed: newUsed,
      editsRemaining: isInner ? null : Math.max(0, TRIAL_LIMIT - newUsed),
    };
  });

export const getBookEditorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("student_profiles")
      .select("is_inner_circle, book_edits_used")
      .eq("user_id", context.userId)
      .maybeSingle();
    const isInner = !!data?.is_inner_circle;
    const used = (data?.book_edits_used as number | undefined) ?? 0;
    const TRIAL_LIMIT = 3;
    return {
      isInnerCircle: isInner,
      editsUsed: used,
      editsRemaining: isInner ? null : Math.max(0, TRIAL_LIMIT - used),
      modes: Object.entries(MODES).map(([id, m]) => ({ id, label: m.label })),
    };
  });
