// VAPI rotation client — silently tries 5 (publicKey, assistantId) pairs.
// On any failure before the call connects, destroys the instance and rotates
// to the next. If all 5 fail, the caller falls back to LiveKit dispatch.
import Vapi from "@vapi-ai/web";

export type VapiPair = { publicKey: string; assistantId: string };

export const VAPI_PAIRS: VapiPair[] = [
  { publicKey: "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1", assistantId: "a16cf991-f420-44f4-8460-0129939c9fe3" },
  { publicKey: "e6bf041d-1c62-4b94-a93c-52b563eef22c", assistantId: "5c3ce312-2f00-486c-8cd9-7da43417af4d" },
  { publicKey: "2ef0603f-4704-4cf4-9be8-a581fc68b192", assistantId: "d1fd7394-f3bc-4a1d-8181-a05a4978c572" },
  { publicKey: "04b01653-b99c-4749-b012-be91aa031768", assistantId: "e4d008ae-429f-4248-a503-33f30917b28e" },
  { publicKey: "146217bf-5d74-4870-acfd-6bad277f66eb", assistantId: "d6f52dbc-eb9b-422e-8815-27bf261ef0a9" },
];

export type VapiHandle = {
  vapi: Vapi;
  pairIndex: number;
  setMuted: (muted: boolean) => void;
  end: () => void;
};

export type VapiCallbacks = {
  onConnected: (h: VapiHandle) => void;
  onEnded: () => void;
  onAllFailed: () => void; // caller should fall back to LiveKit
};

export async function startCallWithRotation(cb: VapiCallbacks): Promise<void> {
  let connected = false;

  const tryPair = async (index: number): Promise<void> => {
    if (index >= VAPI_PAIRS.length) {
      cb.onAllFailed();
      return;
    }
    const pair = VAPI_PAIRS[index];
    const vapi = new Vapi(pair.publicKey);
    let settled = false;

    const rotate = (reason: string) => {
      if (settled || connected) return;
      settled = true;
      console.warn(`[vapi] pair ${index + 1} failed: ${reason}, rotating`);
      try { vapi.stop(); } catch { /* noop */ }
      void tryPair(index + 1);
    };

    vapi.on("error", (e) => rotate(`error: ${String(e)}`));
    vapi.on("call-end", () => {
      if (!connected) rotate("call-end before connect");
      else cb.onEnded();
    });
    vapi.on("call-start", () => {
      if (settled) return;
      settled = true;
      connected = true;
      cb.onConnected({
        vapi,
        pairIndex: index,
        setMuted: (m: boolean) => { try { vapi.setMuted(m); } catch { /* noop */ } },
        end: () => { try { vapi.stop(); } catch { /* noop */ } },
      });
    });

    try {
      await vapi.start(pair.assistantId);
    } catch (e) {
      rotate(`start threw: ${String(e)}`);
    }

    // Guard: if neither call-start nor error fires within 15s, rotate.
    setTimeout(() => rotate("connect timeout 15s"), 15000);
  };

  await tryPair(0);
}

// LiveKit fallback dispatcher
export async function startLiveKitFallback(email: string): Promise<{ token: string; url: string; roomName: string } | null> {
  try {
    const r = await fetch("/api/public/hooks/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.error("livekit fallback failed", e);
    return null;
  }
}
