// No more createServerFn — direct fetch to our own API route
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export type AskNathyInput = z.infer<typeof inputSchema>;

export async function askNathy(input: AskNathyInput): Promise<{ reply: string; error: string | null }> {
  const FRIENDLY_FALLBACK =
    "Let me connect you with our team! 💛 WhatsApp us at 09164266235 — we'll get back to you personally right away.";

  try {
    const res = await fetch("/api/ask-nathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputSchema.parse(input)),
    });

    if (!res.ok) {
      console.error("ask-nathy API error", res.status);
      return { reply: FRIENDLY_FALLBACK, error: "api_error" };
    }

    const json = await res.json();
    return { reply: json.reply ?? FRIENDLY_FALLBACK, error: json.error ?? null };
  } catch (err) {
    console.error("Ask Nathy fetch error", err);
    return { reply: FRIENDLY_FALLBACK, error: "exception" };
  }
}
