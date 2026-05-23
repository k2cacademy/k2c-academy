import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Keep-alive ping — inserts a row and prunes anything older than 7 days.
// Called by pg_cron every 3 days to prevent Supabase free-tier pausing.
async function ping() {
  const insert = await supabaseAdmin.from("keep_alive").insert({});
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const del = await supabaseAdmin.from("keep_alive").delete().lt("pinged_at", cutoff);
  return { inserted: !insert.error, deleted: !del.error };
}

export const Route = createFileRoute("/api/public/hooks/keep-alive")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, ...(await ping()) }),
      POST: async () => Response.json({ ok: true, ...(await ping()) }),
    },
  },
});
