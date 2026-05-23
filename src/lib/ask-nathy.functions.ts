import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ASK_NATHY_SYSTEM_PROMPT } from "./ask-nathy-brain";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export const askNathy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const FRIENDLY_FALLBACK =
      "Let me connect you with our team! 💛 WhatsApp us at 09164266235 — we'll get back to you personally right away.";

    // Try Groq first (fast, dedicated), fall back to Lovable AI Gateway.
    const groqKey = process.env.GROQ_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    const callGroq = async () => {
      if (!groqKey) return null;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: ASK_NATHY_SYSTEM_PROMPT },
            ...data.messages,
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
      if (!res.ok) {
        console.error("Groq error", res.status, await res.text().catch(() => ""));
        return null;
      }
      const json = await res.json();
      return json?.choices?.[0]?.message?.content?.trim() || null;
    };

    const callLovable = async () => {
      if (!lovableKey) return null;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: ASK_NATHY_SYSTEM_PROMPT },
            ...data.messages,
          ],
        }),
      });
      if (!res.ok) {
        console.error("Lovable AI error", res.status, await res.text().catch(() => ""));
        return null;
      }
      const json = await res.json();
      return json?.choices?.[0]?.message?.content?.trim() || null;
    };

    try {
      const reply = (await callGroq()) ?? (await callLovable());
      return { reply: reply ?? FRIENDLY_FALLBACK, error: reply ? null : ("fallback" as const) };
    } catch (err) {
      console.error("Ask Nathy error", err);
      return { reply: FRIENDLY_FALLBACK, error: "exception" as const };
    }
  });
