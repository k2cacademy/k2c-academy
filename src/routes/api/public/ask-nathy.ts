import { createAPIFileRoute } from "@tanstack/react-start/api";
import { ASK_NATHY_SYSTEM_PROMPT } from "@/lib/ask-nathy-brain";

export const APIRoute = createAPIFileRoute("/api/ask-nathy")({
  POST: async ({ request }) => {
    const FRIENDLY_FALLBACK =
      "Let me connect you with our team! 💛 WhatsApp us at 09164266235 — we'll get back to you personally right away.";

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let messages: { role: string; content: string }[] = [];
    try {
      const body = await request.json() as { messages: typeof messages };
      messages = body.messages ?? [];
    } catch {
      return Response.json({ reply: FRIENDLY_FALLBACK, error: "invalid_body" }, { status: 400 });
    }

    const callGroq = async () => {
      if (!groqKey) return null;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: ASK_NATHY_SYSTEM_PROMPT }, ...messages],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
      if (!res.ok) { console.error("Groq error", res.status); return null; }
      const json = await res.json() as { choices: { message: { content: string } }[] };
      return json?.choices?.[0]?.message?.content?.trim() || null;
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
      const json = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
      return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    };

    try {
      const reply = (await callGroq()) ?? (await callGemini());
      return Response.json({ reply: reply ?? FRIENDLY_FALLBACK, error: reply ? null : "fallback" });
    } catch (err) {
      console.error("Ask Nathy handler error", err);
      return Response.json({ reply: FRIENDLY_FALLBACK, error: "exception" }, { status: 500 });
    }
  },
});
