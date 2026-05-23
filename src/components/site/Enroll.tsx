import { useState } from "react";
import {
  MessageCircle,
  Mail,
  ShoppingBag,
  Megaphone,
  Calendar,
  Send,
} from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONTACT_LINKS = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "0916 426 6235",
    href: "https://wa.me/2349164266235",
  },
  { icon: Mail, label: "Email", value: "k2cacademy001@gmail.com", href: "mailto:k2cacademy001@gmail.com" },
  {
    icon: ShoppingBag,
    label: "Selar Store",
    value: "Buy our other products",
    href: "https://selar.com/m/K2%C3%87Academy",
  },
  {
    icon: Megaphone,
    label: "WhatsApp Channel",
    value: "Daily tips",
    href: "https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y",
  },
  {
    icon: Calendar,
    label: "Free Sunday class",
    value: "Every Sunday 8pm WAT",
    href: "https://chat.whatsapp.com/CrNR2l6QeOq5dqkLk7jlKf?mode=gi_t",
  },
];

export function Enroll() {
  const [interest, setInterest] = useState("Zero to First Online Sale System");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();

    const text = [
      `Hi K2Ç Academy! My name is ${name}.`,
      `WhatsApp: ${phone}`,
      `I'm interested in: ${interest}`,
      message ? `Message: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/2349164266235?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <section id="contact" className="relative bg-card/30 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Enroll</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Ready to <span className="text-primary">level up?</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Tell us where you're at — we'll match you to the right program and walk you through
            enrollment.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-3">
            {CONTACT_LINKS.map(({ icon: Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 sm:p-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">{label}</div>
                  <div className="truncate text-sm text-muted-foreground">{value}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
          >
            <p className="mb-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Enrol in seconds — your message opens directly in WhatsApp
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="enroll-name">Full name</Label>
                <Input
                  id="enroll-name"
                  name="name"
                  required
                  maxLength={100}
                  className="mt-1.5 border-border bg-background"
                />
              </div>
              <div>
                <Label htmlFor="enroll-phone">WhatsApp number</Label>
                <Input
                  id="enroll-phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  placeholder="e.g. 0916 426 6235"
                  className="mt-1.5 border-border bg-background"
                />
              </div>
              <div>
                <Label>I'm interested in</Label>
                <Select value={interest} onValueChange={setInterest}>
                  <SelectTrigger className="mt-1.5 border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zero to First Online Sale System">
                      Zero to First Online Sale System
                    </SelectItem>
                    <SelectItem value="K2Ç Partners Program">K2Ç Partners Program</SelectItem>
                    <SelectItem value="Free Sunday Class">Free Sunday Class</SelectItem>
                    <SelectItem value="Just exploring">Just exploring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="enroll-message">Your message</Label>
                <Textarea
                  id="enroll-message"
                  name="message"
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell us a bit about where you're at..."
                  className="mt-1.5 border-border bg-background"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
              >
                <Send className="mr-2 h-4 w-4" />
                Enrol on WhatsApp
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
