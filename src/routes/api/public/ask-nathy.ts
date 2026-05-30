import { createFileRoute } from "@tanstack/react-router";
import { ASK_NATHY_SYSTEM_PROMPT } from "@/lib/ask-nathy-brain";

export const Route = createFileRoute("/api/public/ask-nathy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const FRIENDLY_FALLBACK =
          "Let me connect you with our team! 💛 WhatsApp us at 09164266235 — we'll get back to you personally right away.";

        let messages: { role: string; content: string }[] = [];
        try {
          const body = await request.json() as { messages: typeof messages };
          messages = body.messages ?? [];
        } catch {
          return new Response(JSON.stringify({ reply: FRIENDLY_FALLBACK }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const groqKey = process.env.GROQ_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        const callGroq = async () => {
          if (!groqKey) return null;
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "system", content: ASK_NATHY_SYSTEM_PROMPT }, ...messages],
              temperature: 0.7, max_tokens: 800,
            }),
          });
          if (!res.ok) { console.error("Groq error", res.status); return null; }
          const j = await res.json() as { choices: { message: { content: string } }[] };
          return j?.choices?.[0]?.message?.content?.trim() || null;
        };

        const callGemini = async () => {
          if (!geminiKey) return null;
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: ASK_NATHY_SYSTEM_PROMPT }] },
                contents: messages.map((m) => ({
                  role: m.role === "assistant" ? "model" : "user",
                  parts: [{ text: m.content }],
                })),
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
              }),
            }
          );
          if (!res.ok) { console.error("Gemini error", res.status); return null; }
          const j = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
          return j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        };

        try {
          const reply = (await callGroq()) ?? (await callGemini());
          return new Response(
            JSON.stringify({ reply: reply ?? FRIENDLY_FALLBACK, error: reply ? null : "fallback" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          console.error("ask-nathy error", err);
          return new Response(JSON.stringify({ reply: FRIENDLY_FALLBACK, error: "exception" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
