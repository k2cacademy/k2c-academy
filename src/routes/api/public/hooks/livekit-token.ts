import { createFileRoute } from "@tanstack/react-router";

const LIVEKIT_URL = "wss://k2c-ai-coach-yt1puc7u.livekit.cloud";
const API_KEY = "API2gd6A36vJdFX";
const API_SECRET = "0mTUBZj9vCmYCfhhieUXWjoP304bc1P9FXr6hND1UeSA";

function b64url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function mintToken(roomName: string, identity: string) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      iss: API_KEY,
      sub: identity,
      iat: now,
      nbf: now,
      exp: now + 3600,
      name: identity,
      video: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
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

export const Route = createFileRoute("/api/public/hooks/livekit-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email } = await request.json();
          if (!email) return Response.json({ error: "Email required" }, { status: 400 });
          const roomName = `coaching-${String(email).replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
          const identity = String(email).split("@")[0] || "student";
          const token = await mintToken(roomName, identity);
          return Response.json({ token, roomName, url: LIVEKIT_URL });
        } catch (e) {
          console.error("livekit-token error", e);
          return Response.json({ error: "Server error" }, { status: 500 });
        }
      },
    },
  },
});
