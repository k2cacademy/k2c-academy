export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ error: "Email required" }, { status: 400 });
    }

    const roomName = `coaching-${email.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
    const participantName = email.split("@")[0];

    const apiKey = "API2gd6A36vJdFX";
    const apiSecret = "0mTUBZj9vCmYCfhhieUXWjoP304bc1P9FXr6hND1UeSA";

    // Build JWT manually (no SDK needed)
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({
      iss: apiKey,
      sub: participantName,
      iat: now,
      exp: now + 3600,
      video: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
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

    const token = `${data}.${sigBase64}`;

    return Response.json({ token, roomName });

  } catch (error) {
    console.error("LiveKit token error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
      }
