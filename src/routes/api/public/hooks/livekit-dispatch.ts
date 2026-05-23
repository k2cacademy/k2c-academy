export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { roomName } = await request.json();
    if (!roomName) {
      return Response.json({ error: "Room name required" }, { status: 400 });
    }

    const apiKey = "API2gd6A36vJdFX";
    const apiSecret = "0mTUBZj9vCmYCfhhieUXWjoP304bc1P9FXr6hND1UeSA";

    // Build agent dispatch JWT
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({
      iss: apiKey,
      iat: now,
      exp: now + 300,
      video: {
        roomCreate: true,
        agentGrant: { room: roomName },
      },
    }));

    const data = `${header}.${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData,
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    const dispatchToken = `${data}.${sigBase64}`;

    // Dispatch agent to room
    const response = await fetch(
      "https://k2c-ai-coach-yt1puc7u.livekit.cloud/twirp/livekit.AgentDispatchService/CreateDispatch",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${dispatchToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_name: roomName,
          agent_name: "K2C-AI-Coach",
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Dispatch error:", err);
      return Response.json({ error: "Failed to dispatch agent" }, { status: 500 });
    }

    return Response.json({ success: true, roomName });

  } catch (error) {
    console.error("Dispatch error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
