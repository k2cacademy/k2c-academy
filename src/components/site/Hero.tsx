import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const ENROLL_URL = "https://oniahemmanuel.systeme.io/da36229f";

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-hero-glow pt-28 pb-20 sm:pt-32 lg:pt-36"
    >
      <div className="mx-auto max-w-5xl px-4 text-left sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
          <span aria-hidden>🇳🇬</span> Nigeria's First Sale Academy
        </span>

        <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          Stop Learning.{" "}
          <span className="text-accent">Start Earning.</span>
          <br className="hidden sm:block" />
          <span className="block sm:inline"> Your First Sale Awaits.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          You already have what it takes. K2Ç Academy helps Nigerian beginners turn existing
          knowledge and skills into real online income — legitimately, without capital or starting
          from scratch.
        </p>

        <div className="mt-9 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            size="lg"
            className="h-12 w-full bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-glow hover:bg-primary/90 sm:px-5 sm:text-base"
            asChild
          >
            <a href={ENROLL_URL} target="_blank" rel="noopener noreferrer">
              Get Instant Access
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full border-foreground/30 bg-transparent px-3 text-sm font-semibold text-foreground hover:bg-card sm:px-5 sm:text-base"
            asChild
          >
            <a
              href="https://chat.whatsapp.com/CrNR2l6QeOq5dqkLk7jlKf?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
            >
              Free Sunday Class
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full border-primary/70 bg-transparent px-3 text-sm font-semibold text-foreground shadow-[0_0_24px_-8px_rgba(124,58,237,0.6)] hover:bg-primary/10 sm:px-5 sm:text-base"
            asChild
          >
            <a href="/student-portal">
              Student Portal 🎓
            </a>
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Prefer bank transfer?{" "}
          <a href="/verify-payment" className="font-semibold text-accent hover:underline">
            Verify your payment instantly →
          </a>
        </p>

        <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-4 sm:gap-8">
          {[
            { v: "7", l: "Core Modules" },
            { v: "15+", l: "Video Lessons" },
            { v: "100%", l: "Practical" },
          ].map((s) => (
            <div key={s.l}>
              <dt className="font-display text-4xl font-bold text-accent sm:text-5xl md:text-6xl">{s.v}</dt>
              <dd className="mt-2 text-xs font-semibold uppercase tracking-wider text-foreground/80 sm:text-sm">
                {s.l}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
