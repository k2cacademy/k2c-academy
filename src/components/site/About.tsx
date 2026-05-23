import { Target, Zap, Users, Lightbulb } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

const VALUES = [
  {
    icon: Target,
    title: "Clarity First",
    body: "We cut through the noise so you know exactly what to do next.",
  },
  {
    icon: Zap,
    title: "Fast Wins",
    body: "Designed to get you to your first sale — not your 100th lesson.",
  },
  {
    icon: Users,
    title: "Community",
    body: "You're never alone. Every student gets guided support.",
  },
  {
    icon: Lightbulb,
    title: "Practical",
    body: "No fluff. Every lesson moves you closer to earning.",
  },
];

export function About() {
  return (
    <section id="about" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Our Story</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Why K2Ç Academy <span className="text-primary">exists</span>
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          <p>
            I'm Oniah Emmanuel — better known as Digital Nathy, founder of K2Ç Academy. I've
            studied Copywriting, Facebook Ads, Affiliate Marketing, Content Creation and more. The
            real breakthrough didn't come from learning more — it came from understanding how the
            system works and actually using it.
          </p>
          <p>
            K2Ç Academy was born to give every Nigerian the clarity and system needed to earn from
            what they already know. Not tomorrow. Not after another course.{" "}
            <span className="font-semibold text-foreground">Now.</span>
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-5">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
