import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

const PLANS = {
  free: { minutes: 10, amount: 0, label: "Free" },
  basic: { minutes: 45, amount: 1000, label: "Basic" },
  premium: { minutes: 99999, amount: 1500, label: "Premium" },
};

// Get current user plan
export const getMyPlan = createServerFn({ method: "GET" }).handler(async () => {
  const db = supabaseAdmin();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await db
    .from("profiles")
    .select("plan, plan_expires_at, voice_minutes_used, voice_minutes_reset_at")
    .eq("id", user.id)
    .single();

  return data;
});

// Initialise Flutterwave payment
export const initFlutterwavePayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        plan: z.enum(["basic", "premium"]),
        email: z.string().email(),
        name: z.string(),
        phone: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const plan = PLANS[data.plan];
    const tx_ref = `K2C-${data.plan.toUpperCase()}-${Date.now()}`;

    return {
      public_key: process.env.FLUTTERWAVE_PUBLIC_KEY!,
      tx_ref,
      amount: plan.amount,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: data.email,
        phone_number: data.phone,
        name: data.name,
      },
      customizations: {
        title: `K2Ç Academy — ${plan.label} Plan`,
        description: `Monthly subscription to K2Ç Academy ${plan.label} Plan`,
        logo: "https://k2cacademy.com/favicon.ico",
      },
      meta: {
        plan: data.plan,
      },
    };
  });

// Verify Flutterwave payment and upgrade plan
export const verifyAndUpgradePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        transaction_id: z.string(),
        plan: z.enum(["basic", "premium"]),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const db = supabaseAdmin();

    // Verify with Flutterwave
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/${data.transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );
    const json = await res.json();

    if (
      json.status !== "success" ||
      json.data.status !== "successful" ||
      json.data.amount < PLANS[data.plan].amount
    ) {
      throw new Error("Payment verification failed");
    }

    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Update profile plan
    await db
      .from("profiles")
      .update({
        plan: data.plan,
        plan_expires_at: expiresAt.toISOString(),
        voice_minutes_used: 0,
        voice_minutes_reset_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Record subscription
    await db.from("subscriptions").insert({
      user_id: user.id,
      plan: data.plan,
      payment_method: "flutterwave",
      payment_reference: json.data.tx_ref,
      amount_paid: json.data.amount,
      expires_at: expiresAt.toISOString(),
    });

    return { success: true, plan: data.plan };
  });

// Initiate Monnify bank transfer
export const initMonnifyPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        plan: z.enum(["basic", "premium"]),
        email: z.string().email(),
        name: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const plan = PLANS[data.plan];
    const reference = `K2C-${data.plan.toUpperCase()}-${Date.now()}`;

    // Get Monnify access token
    const credentials = Buffer.from(
      `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
    ).toString("base64");

    const tokenRes = await fetch(
      "https://api.monnify.com/api/v1/auth/login",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.responseBody?.accessToken;
    if (!accessToken) throw new Error("Monnify auth failed");

    // Initialize transaction
    const initRes = await fetch(
      "https://api.monnify.com/api/v1/merchant/transactions/init-transaction",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: plan.amount,
          customerName: data.name,
          customerEmail: data.email,
          paymentReference: reference,
          paymentDescription: `K2Ç Academy ${plan.label} Plan`,
          currencyCode: "NGN",
          contractCode: process.env.MONNIFY_CONTRACT_CODE,
          redirectUrl: `${process.env.APP_URL}/portal?payment=success&plan=${data.plan}`,
          paymentMethods: ["ACCOUNT_TRANSFER", "CARD"],
        }),
      }
    );

    const initJson = await initRes.json();
    if (!initJson.requestSuccessful) throw new Error("Monnify init failed");

    return {
      checkout_url: initJson.responseBody.checkoutUrl,
      reference,
    };
  });
