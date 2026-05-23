import { useState } from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LeadMagnet() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const whatsapp = String(fd.get("whatsapp") || "").trim();

    if (!name || !email) {
      toast.error("Please add your name and email.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/public/send-lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, whatsapp }),
      });

      if (!response.ok) throw new Error("Failed to send");

      setDone(true);
      toast.success("Check your email! Your free guide is on its way 🎉");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="grid gap-0 lg:grid-cols-2">
            {/* Left */}
            <div className="relative bg-hero-glow p-8 sm:p-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
                <FileText className="h-3.5 w-3.5" />
                Free PDF Guide
              </span>
              <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                5 things you already know that can{" "}
                <span className="text-primary">earn you money online</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                A free, no-fluff PDF showing you the everyday skills you can monetize this week —
                straight from the K2Ç playbook.
              </p>
            </div>

            {/* Right */}
            <div className="bg-background/40 p-8 sm:p-12">
              {done ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-14 w-14 text-success" />
                  <h3 className="mt-4 font-display text-2xl font-bold text-foreground">
                    Check your email!
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Your free guide is on its way 🎉
                  </p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div>
                    <Label htmlFor="lead-name" className="text-foreground">
                      Your name
                    </Label>
                    <Input
                      id="lead-name"
                      name="name"
                      required
                      maxLength={100}
                      placeholder="e.g. Chinedu"
                      className="mt-1.5 border-border bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-email" className="text-foreground">
                      Email
                    </Label>
                    <Input
                      id="lead-email"
                      name="email"
                      type="email"
                      required
                      maxLength={255}
                      placeholder="you@example.com"
                      className="mt-1.5 border-border bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-whatsapp" className="text-foreground">
                      WhatsApp <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="lead-whatsapp"
                      name="whatsapp"
                      type="tel"
                      maxLength={30}
                      placeholder="0916 426 6235"
                      className="mt-1.5 border-border bg-background"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
                  >
                    {submitting ? "Sending..." : "Send me the free PDF"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    No spam. Unsubscribe anytime.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
                    }
