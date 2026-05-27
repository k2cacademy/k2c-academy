import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Zap, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  initFlutterwavePayment,
  initMonnifyPayment,
  verifyAndUpgradePlan,
} from "@/lib/subscription.functions";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Star,
    color: "border-border",
    badge: null,
    features: [
      "10 mins AI coach per month",
      "Student portal access",
      "Birthday data gift",
      "Free Sunday class",
      "Community access",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: 1000,
    icon: Zap,
    color: "border-primary",
    badge: "Most Popular",
    features: [
      "45 mins AI coach per month",
      "Everything in Free",
      "Priority WhatsApp support",
      "All course modules",
      "Ambassador program access",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 1500,
    icon: Crown,
    color: "border-accent",
    badge: "Best Value",
    features: [
      "Unlimited AI coach minutes",
      "Everything in Basic",
      "First Sale Certificate fast-track",
      "Book editor access",
      "Exclusive premium community",
      "Monthly bonus resources",
    ],
  },
] as const;

type PlanId = "free" | "basic" | "premium";

export function PlansPanel({ currentPlan = "free", profile }: {
  currentPlan?: PlanId;
  profile: { full_name: string; email: string; whatsapp?: string };
}) {
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [payModal, setPayModal] = useState<{
    plan: "basic" | "premium";
    method: "flutterwave" | "monnify";
  } | null>(null);

  const initFLW = useServerFn(initFlutterwavePayment);
  const initMonnify = useServerFn(initMonnifyPayment);
  const verifyUpgrade = useServerFn(verifyAndUpgradePlan);

  const handleFlutterwave = async (plan: "basic" | "premium") => {
    setLoading(plan);
    try {
      const config = await initFLW({
        data: {
          plan,
          email: profile.email,
          name: profile.full_name,
          phone: profile.whatsapp || "09000000000",
        },
      });

      // Load Flutterwave inline script
      const script = document.createElement("script");
      script.src = "https://checkout.flutterwave.com/v3.js";
      document.head.appendChild(script);
      script.onload = () => {
        (window as unknown as {
          FlutterwaveCheckout: (config: unknown) => void
        }).FlutterwaveCheckout({
          ...config,
          callback: async (response: { transaction_id: string; status: string }) => {
            if (response.status === "successful") {
              try {
                await verifyUpgrade({
                  data: {
                    transaction_id: String(response.transaction_id),
                    plan,
                  },
                });
                toast.success(`🎉 Welcome to ${plan} plan!`);
                window.location.reload();
              } catch {
                toast.error("Payment verified but upgrade failed. WhatsApp us at 09164266235");
              }
            }
          },
          onclose: () => setLoading(null),
        });
      };
    } catch (err) {
      toast.error("Could not initialise payment. Please try again.");
      setLoading(null);
    }
  };

  const handleMonnify = async (plan: "basic" | "premium") => {
    setLoading(plan);
    try {
      const { checkout_url } = await initMonnify({
        data: {
          plan,
          email: profile.email,
          name: profile.full_name,
        },
      });
      window.open(checkout_url, "_blank");
    } catch {
      toast.error("Could not initialise payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-foreground">Subscription Plans</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upgrade anytime. Cancel anytime. Built for Nigerian students.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const isUpgrade = plan.price > 0;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 ${plan.color} bg-background p-5 transition-all ${
                isCurrent ? "ring-2 ring-primary/40" : ""
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${
                  plan.id === "premium"
                    ? "text-accent"
                    : plan.id === "basic"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`} />
                <h3 className="font-display text-lg font-bold text-foreground">
                  {plan.name}
                </h3>
              </div>

              <div className="mt-3">
                {plan.price === 0 ? (
                  <span className="font-display text-3xl font-bold text-foreground">
                    Free
                  </span>
                ) : (
                  <div>
                    <span className="font-display text-3xl font-bold text-foreground">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">/month</span>
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <div className="rounded-xl bg-primary/10 py-2 text-center text-xs font-bold text-primary">
                    Current Plan ✓
                  </div>
                ) : isUpgrade ? (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                      disabled={loading === plan.id}
                      onClick={() => handleFlutterwave(plan.id as "basic" | "premium")}
                    >
                      {loading === plan.id ? "Loading…" : "Pay with Card"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-border text-xs"
                      disabled={loading === plan.id}
                      onClick={() => handleMonnify(plan.id as "basic" | "premium")}
                    >
                      Bank Transfer
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Having trouble paying?{" "}
        <a
          href="https://wa.me/2349164266235"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline font-semibold"
        >
          WhatsApp us →
        </a>
      </p>
    </div>
  );
}
