import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { issueFirstSaleCertificate } from "./certificate.functions";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!data) {
      const { data: created, error: insErr } = await supabase
        .from("student_profiles")
        .insert({ user_id: userId })
        .select("*")
        .single();
      if (insErr) throw new Error(insErr.message);
      return created;
    }
    return data;
  });

const onboardingSchema = z.object({
  full_name: z.string().min(2).max(120),
  whatsapp: z.string().min(7).max(20),
  phone_number: z.string().min(10).max(15),
  network: z.enum(["MTN", "Glo", "Airtel", "9mobile"]),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => onboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("student_profiles")
      .update({ ...data, onboarding_complete: true })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markFirstSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    if (profile.first_sale_made && profile.certificate_issued) {
      return { ok: true, alreadyIssued: true };
    }
    if (!profile.full_name) {
      throw new Error("Please complete your profile first.");
    }

    const cert = await issueFirstSaleCertificate({
      userId,
      fullName: profile.full_name,
    });

    await supabase
      .from("student_profiles")
      .update({ first_sale_made: true, certificate_issued: true })
      .eq("user_id", userId);

    return { ok: true, pdfUrl: cert.pdfUrl };
  });

export const getMyCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyBirthdayGifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("birthday_data_log")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
