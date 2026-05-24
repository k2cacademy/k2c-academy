import { createFileRoute } from "@tanstack/react-router";

const LIVEKIT_HTTP = "https://k2c-ai-coach-yt1puc7u.livekit.cloud";
const API_KEY = "API2gd6A36vJdFX";
const API_SECRET = "0mTUBZj9vCmYCfhhieUXWjoP304bc1P9FXr6hND1UeSA";
const AGENT_NAME = "K2C-AI-Coach";

function b64url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function mintDispatchToken(roomName: string) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      iss: API_KEY,
      sub: "agent-dispatcher",
      iat: now,
      nbf: now,
      exp: now + 300,
      video: {
        roomCreate: true,
        roomAdmin: true,
        room: roomName,
      },
    }),
  );
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

export const Route = createFileRoute("/api/public/hooks/livekit-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { roomName } = await request.json();
          if (!roomName) return Response.json({ error: "Room name required" }, { status: 400 });
          const dispatchToken = await mintDispatchToken(roomName);
          const res = await fetch(
            `${LIVEKIT_HTTP}/twirp/livekit.AgentDispatchService/CreateDispatch`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${dispatchToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ room: roomName, agent_name: AGENT_NAME }),
            },
          );
          if (!res.ok) {
            const err = await res.text();
            console.error("LiveKit dispatch failed:", res.status, err);
            return Response.json({ error: "Dispatch failed", detail: err }, { status: 500 });
          }
          return Response.json({ success: true, roomName });
        } catch (e) {
          console.error("livekit-dispatch error", e);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
