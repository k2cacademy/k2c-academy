import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#programs", label: "Programs" },
  { href: "#team", label: "Team" },
  { href: "#results", label: "Results" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

const ENROLL_URL = "https://oniahemmanuel.systeme.io/da36229f";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="#top" aria-label="K2Ç Academy home">
          <Logo />
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="outline"
            className="border-border bg-transparent text-foreground hover:bg-card"
            asChild
          >
            <Link to="/portal">Student Portal</Link>
          </Button>
          <Button className="bg-primary text-primary-foreground shadow-glow hover:bg-primary/90" asChild>
            <a href={ENROLL_URL} target="_blank" rel="noopener noreferrer">
              Enroll Now
            </a>
          </Button>
        </div>

        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={`overflow-hidden border-b border-border/60 bg-background/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden ${
          open ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-1 px-4 pb-4 pt-2 sm:px-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-card hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" className="border-border bg-transparent" asChild>
              <a href="#team" onClick={() => setOpen(false)}>
                Student Coach
              </a>
            </Button>
            <Button className="bg-primary text-primary-foreground" asChild>
              <a href={ENROLL_URL} target="_blank" rel="noopener noreferrer">
                Enroll Now
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
