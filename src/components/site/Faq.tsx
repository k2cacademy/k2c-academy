import { SectionLabel } from "./SectionLabel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What exactly is K2Ç Academy?",
    a: "K2Ç (Knowledge to Cash) Academy is Nigeria's first sale academy. We help beginners turn the knowledge and skills they already have into real online income — without capital, fluff, or starting from scratch.",
  },
  {
    q: "Do I need any prior experience or capital to start?",
    a: "No. The flagship program is built specifically for total beginners. You don't need a website, a product of your own, or money to run ads. You just need an internet-enabled phone and the willingness to take action.",
  },
  {
    q: "How is this different from the courses I've already taken?",
    a: "Most courses give you more information. K2Ç gives you a system. We focus on getting you to your first real sale — not your 100th lesson — with templates, scripts, and step-by-step guidance.",
  },
  {
    q: "How much does the flagship program cost and how do I pay?",
    a: "The Zero to First Online Sale System is ₦9,997. You pay securely via the enrolment link on this page (Get Instant Access) and get immediate access to all 7 modules and templates.",
  },
  {
    q: "How long until I make my first sale?",
    a: "Many students hit their first sale within 7–14 days of taking action. Your timeline depends entirely on how consistently you apply the system — but the path is laid out for you step by step.",
  },
  {
    q: "What is the K2Ç Partners Program?",
    a: "It's our partnership track — a 9-module training that helps you earn commissions by promoting K2Ç offers. You get word-for-word scripts, identity-based positioning, and a community moving in the same direction.",
  },
  {
    q: "Is the free Sunday class really free?",
    a: "Yes. Every Sunday at 8pm, Digital Nathy runs a live WhatsApp class with zero cost. Just message us on WhatsApp to get added.",
  },
  {
    q: "How do I get support after enrolling?",
    a: "Every K2Ç student gets community support and direct access to coaches via our private channels. You're never figuring this out alone.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Got <span className="text-primary">questions?</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Everything you need to know before enrolling.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card"
        >
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-0 px-5 sm:px-6">
              <AccordionTrigger className="py-5 text-left font-display text-base font-semibold text-foreground hover:no-underline sm:text-lg">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
