import { Megaphone, Users, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "./SectionLabel";

const ENROLL_URL = "https://oniahemmanuel.systeme.io/da36229f";

const PROGRAMS = [
  {
    icon: Megaphone,
    badge: "Flagship",
    title: "Zero to First Online Sale System",
    subtitle: "Get Instant Access",
    subtitleHref: ENROLL_URL,
    description:
      "A complete step-by-step program that takes any Nigerian beginner from zero to making their first legitimate online sale — using the knowledge and skills they already have.",
    features: [
      "7 core modules",
      "WhatsApp and social sales",
      "Sales copy templates",
    ],
    price: "₦9,997",
    cta: ENROLL_URL,
    external: true,
  },
  {
    icon: Users,
    badge: "Earn with us",
    title: "K2Ç Partners Program",
    subtitle: "Apply Now",
    subtitleHref: "https://chat.whatsapp.com/Djrfpl0rySL7ESvdzm1ptY",
    description:
      "Engineer your first partner commission within 7 days — with exact scripts, identity-based positioning, and a community that moves together.",
    features: [
      "9-module partner training",
      "Word-for-word scripts",
      "Competitive commissions",
    ],
    price: null,
    cta: "https://chat.whatsapp.com/Djrfpl0rySL7ESvdzm1ptY",
    external: true,
  },
];

export function Programs() {
  return (
    <section id="programs" className="relative bg-card/30 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Programs</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            From zero to <span className="text-primary">first sale</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Two programs, one mission: help you earn from what you already know.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {PROGRAMS.map((p) => {
            const Icon = p.icon;
            return (
              <article
                key={p.title}
                className="relative flex flex-col rounded-3xl border border-border bg-card p-7 shadow-card transition-all hover:border-primary/60 sm:p-9"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-purple text-primary-foreground shadow-glow">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
                    {p.badge}
                  </span>
                </div>

                <h3 className="mt-6 font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {p.title}
                </h3>

                <a
                  href={p.subtitleHref}
                  target={p.external ? "_blank" : undefined}
                  rel={p.external ? "noopener noreferrer" : undefined}
                  className="mt-2 inline-block text-sm font-bold text-primary hover:text-primary-glow"
                >
                  {p.subtitle} →
                </a>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {p.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex items-end justify-between gap-4 border-t border-border pt-6">
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <a
                      href={p.cta}
                      target={p.external ? "_blank" : undefined}
                      rel={p.external ? "noopener noreferrer" : undefined}
                    >
                      View Details
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                  {p.price && (
                    <div className="text-right">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Price
                      </div>
                      <div className="font-display text-2xl font-bold text-accent">{p.price}</div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
