import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Programs } from "@/components/site/Programs";
import { StatsCounter } from "@/components/site/StatsCounter";
import { Team } from "@/components/site/Team";
import { Results } from "@/components/site/Results";
import { LeadMagnet } from "@/components/site/LeadMagnet";
import { Faq } from "@/components/site/Faq";
import { Enroll } from "@/components/site/Enroll";
import { Footer } from "@/components/site/Footer";
import { FloatingButtons } from "@/components/site/FloatingButtons";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Programs />
        <StatsCounter />
        <Team />
        <Results />
        <LeadMagnet />
        <Faq />
        <Enroll />
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
