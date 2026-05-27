import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { session } = await request.json();
    if (!session) return Response.json({ error: "Session required" }, { status: 400 });

    // Check if student already has a Vapi session ID
    const { data: profile } = await supabaseAdmin
      .from("student_profiles")
      .select("vapi_session_id, email, first_name")
      .eq("session", session)  
      .maybeSingle();

    if (!profile) return Response.json({ error: "Student not found" }, { status: 404 });

    // If already has Vapi session ID, return it
    if (profile.vapi_session_id) {
      return Response.json({ 
        vapiSessionId: profile.vapi_session_id,
        isReturning: true 
      });
    }

    // Create new Vapi session via their API
    const vapiRes = await fetch("https://api.vapi.ai/session", {
      method: "POST",
      headers: {
        "Authorization": `Bearer 49d3fa8f-22b0-43ff-9a96-5987880681c2`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: "a16cf991-f420-44f4-8460-0129939c9fe3",
        metadata: {
          student_email: profile.email,
          student_name: profile.first_name,
        },
      }),
    });

    if (!vapiRes.ok) {
      const err = await vapiRes.text();
      console.error("Vapi session error:", err);
      return Response.json({ error: "Failed to create Vapi session" }, { status: 500 });
    }

    const vapiData = await vapiRes.json();
    const vapiSessionId = vapiData.id;

    // Save Vapi session ID to student profile permanently
    await supabaseAdmin
      .from("student_profiles")
      .update({ vapi_session_id: vapiSessionId })
      .eq("session", session);

    return Response.json({ 
      vapiSessionId,
      isReturning: false 
    });

  } catch (error) {
    console.error("Vapi session error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
