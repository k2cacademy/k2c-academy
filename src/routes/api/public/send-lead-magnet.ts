import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Download, Sparkles } from "lucide-react";

// TODO: Replace with the public URL of the uploaded PDF in the `lead-magnets` storage bucket.
const LEAD_MAGNET_PDF_URL = "/lead-magnet.pdf";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(255),
  whatsapp: z
    .string()
    .trim()
    .max(20, "WhatsApp number is too long")
    .optional()
    .or(z.literal("")),
});

export const LeadMagnet = () => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      whatsapp: String(fd.get("whatsapp") || ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      whatsapp: parsed.data.whatsapp || null,
      source: "lead-magnet",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't save your details. Try again.");
      return;
    }
    // Track lead with Meta Pixel if available
    // @ts-ignore
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      // @ts-ignore
      window.fbq("track", "Lead", { content_name: "Free PDF Guide" });
    }
    setDone(true);
    toast.success("Check your screen — your free guide is ready.");
    // Open PDF in new tab
    window.open(LEAD_MAGNET_PDF_URL, "_blank", "noopener");
    // Redirect to thank-you page so they join the WhatsApp community
    setTimeout(() => navigate("/thank-you?type=lead"), 600);
  };

  return (
    <section id="free-guide" className="py-24 md:py-32">
      <div className="container">
        <div className="max-w-4xl mx-auto rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 md:p-14 card-glow">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> FREE PDF GUIDE
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                5 things you already know that can <span className="gradient-text">earn you money online</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                A free, no-fluff PDF showing you the everyday skills you can monetize this week — straight from the K2Ç playbook.
              </p>
            </div>

            {done ? (
              <div className="text-center p-8 rounded-2xl bg-card border border-primary/40">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-xl font-semibold mb-2">You're in!</h3>
                <p className="text-muted-foreground mb-5">If your download didn't start, click below.</p>
                <Button asChild variant="hero" className="w-full">
                  <a href={LEAD_MAGNET_PDF_URL} target="_blank" rel="noopener">
                    <Download className="mr-1 w-4 h-4" /> Download PDF
                  </a>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 p-6 rounded-2xl bg-card border border-border">
                <div>
                  <Label htmlFor="lm-name">Your name</Label>
                  <Input id="lm-name" name="name" required maxLength={80} className="mt-2 h-11" placeholder="Emmanuel" />
                </div>
                <div>
                  <Label htmlFor="lm-email">Email</Label>
                  <Input id="lm-email" name="email" type="email" required maxLength={255} className="mt-2 h-11" placeholder="you@email.com" />
                </div>
                <div>
                  <Label htmlFor="lm-whatsapp">WhatsApp <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="lm-whatsapp" name="whatsapp" maxLength={20} className="mt-2 h-11" placeholder="08012345678" />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                  {submitting ? "Sending..." : (<><Download className="mr-1 w-4 h-4" /> Send me the free PDF</>)}
                </Button>
                <p className="text-xs text-muted-foreground text-center">No spam. Unsubscribe anytime.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
