// RAG layer for the AI Coach — queries the EXTERNAL "coach brain" Supabase
// project (separate from the app's Supabase) via the `match_coach_brain` RPC.
// Returns top text chunks for injection into the coach system prompt.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
function client(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.COACH_BRAIN_SUPABASE_URL;
  const key = process.env.COACH_BRAIN_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-embedding-001",
        input: text,
      }),
    });
    if (!res.ok) {
      console.error("Embedding failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const j = await res.json();
    return j?.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.error("Embedding exception", e);
    return null;
  }
}

export async function fetchBrainContext(query: string, matchCount = 4): Promise<string> {
  const sb = client();
  if (!sb) return "";
  const vec = await embed(query);
  if (!vec) return "";
  try {
    const { data, error } = await sb.rpc("match_coach_brain", {
      query_embedding: vec,
      match_count: matchCount,
    });
    if (error) {
      console.error("match_coach_brain RPC error", error);
      return "";
    }
    if (!Array.isArray(data) || data.length === 0) return "";
    const chunks = data
      .map((row: { content?: string; chunk?: string; text?: string }) =>
        row.content ?? row.chunk ?? row.text ?? "",
      )
      .filter(Boolean)
      .slice(0, matchCount);
    if (chunks.length === 0) return "";
    return [
      "",
      "# RELEVANT KNOWLEDGE FROM YOUR BRAIN (use these to give pinpoint, accurate answers — always respond as Digital Nathy):",
      ...chunks.map((c, i) => `--- Chunk ${i + 1} ---\n${c}`),
      "",
    ].join("\n");
  } catch (e) {
    console.error("Brain RAG exception", e);
    return "";
  }
}
