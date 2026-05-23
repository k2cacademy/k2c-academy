import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendMessage, escapeHtml, formatWAT } from "@/lib/telegram.server";

type Payload = {
  event?: string;
  event_type?: string;
  type?: string;
  data?: Record<string, unknown> & { email?: string; contact?: { email?: string }; module_name?: string; course_name?: string };
  email?: string;
};

function extractEmail(p: Payload): string | null {
  return (
    p.data?.email ??
    p.data?.contact?.email ??
    p.email ??
    null
  );
}

function extractEvent(p: Payload): string {
  return (p.event ?? p.event_type ?? p.type ?? "unknown").toString();
}

export const Route = createFileRoute("/api/public/hooks/systemeio-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: Payload = {};
        try {
          payload = JSON.parse(raw) as Payload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = extractEvent(payload);
        const email = extractEmail(payload);

        await supabaseAdmin.from("systemeio_events").insert({
          event_type: event,
          student_email: email,
          payload: payload as unknown as Record<string, unknown>,
        });

        if (email) {
          const moduleName =
            (payload.data?.module_name as string | undefined) ??
            (payload.data?.course_name as string | undefined) ??
            null;
          await supabaseAdmin.from("student_events").insert({
            student_email: email,
            event_type: event,
            module_name: moduleName,
            metadata: (payload.data ?? {}) as Record<string, unknown>,
          });

          // Telegram alerts for key events
          const lower = event.toLowerCase();
          if (lower.includes("lesson") || lower.includes("module") || lower.includes("course") || lower.includes("enroll")) {
            const headline = lower.includes("course_completed") || lower.includes("course.completed")
              ? "🏆 COURSE COMPLETED"
              : lower.includes("module")
                ? "📘 MODULE COMPLETED"
                : lower.includes("lesson")
                  ? "📖 LESSON COMPLETED"
                  : "🎓 NEW ENROLLMENT";
            await sendMessage({
              text: `<b>${headline}</b>\n${escapeHtml(email)}${moduleName ? `\n${escapeHtml(moduleName)}` : ""}\n<i>${formatWAT(new Date())}</i>`,
            }).catch(() => undefined);
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
