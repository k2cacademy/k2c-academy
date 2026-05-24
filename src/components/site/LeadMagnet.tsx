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

    if (!name || !email) {
      toast.error("Please add your name and email.");
      return;
    }

    const firstName = name.split(" ")[0];
    const pdfUrl = "https://k2c-academy.lovable.app/5-things-you-already-know.pdf";

    try {
      setSubmitting(true);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer re_cULx4BLu_LwMSWXukgGKy8nTzs4RrgEjX`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Digital Nathy <onboarding@resend.dev>",
          to: [email],
          subject: "Your free K2Ç guide is here — plus one thing to know 🎁",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
              <h1 style="color: #FFD700; font-size: 22px; line-height: 1.4;">Your free K2Ç guide is here — plus one thing to know 🎁</h1>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">Hey ${firstName}!</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Your free guide — <strong style="color: #ffffff;">5 Things You Already Know That Can Earn You Money Online</strong> — is ready. Read it today. Pick one skill. That is your starting point.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${pdfUrl}" style="background: #FFD700; color: #000000; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                  📄 Download Your Free PDF
                </a>
              </div>
              <p style="color: #cccccc; font-size: 15px; text-align: center;">
                Prefer the raw PDF link? <a href="${pdfUrl}" style="color: #FFD700; text-decoration: underline;">Download it here.</a>
              </p>
              <hr style="border: none; border-top: 1px solid #333; margin: 28px 0;" />
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                But here is what the guide cannot do: it cannot show you <strong style="color: #ffffff;">HOW</strong> to turn that skill into your first sale. That is exactly what the <strong style="color: #ffffff;">Zero to First Online Sale System</strong> does.
              </p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                150+ Nigerian beginners have already used it to make their first legitimate online sale. Your turn starts here:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="https://oniahemmanuel.systeme.io/da36229f" style="background: #FFD700; color: #000000; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                  GET INSTANT ACCESS — ₦9,997 🚀
                </a>
              </div>
              <div style="background: #7C3AED; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <p style="color: #ffffff; margin: 0 0 14px 0; font-size: 15px;">Join our WhatsApp Channel for free daily tips from Digital Nathy:</p>
                <a href="https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y" style="background: #FFD700; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Join WhatsApp Channel 📣
                </a>
              </div>
              <p style="color: #FFD700; font-size: 17px; font-weight: bold; margin-top: 28px;">Stop Learning. Start Earning.</p>
              <p style="color: #888888; font-size: 13px; margin-top: 8px;">— Digital Nathy, Nigeria's First Sale Coach 💜</p>
              <p style="color: #555555; font-size: 12px; font-style: italic; margin-top: 16px;">
                P.S. Every student who commits to the system makes their first sale. The only ones who don't are the ones who never start.
              </p>
            </div>
          `,
        }),
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
                    <Label htmlFor="lead-name" className="text-foreground">Your name</Label>
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
                    <Label htmlFor="lead-email" className="text-foreground">Email</Label>
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
