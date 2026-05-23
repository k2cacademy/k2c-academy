import { Logo } from "./Logo";

const QUICK = [
  { href: "#about", label: "About" },
  { href: "#programs", label: "Programs" },
  { href: "#results", label: "Results" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
  { href: "#team", label: "Student Coach" },
];

const SOCIAL = [
  { href: "https://tiktok.com/@digitalnathy", label: "TikTok @digitalnathy" },
  { href: "https://instagram.com/digitalnathy", label: "Instagram @digitalnathy" },
  { href: "https://www.facebook.com/share/18VfV5h8jS/", label: "Facebook" },
  { href: "https://whatsapp.com/channel/0029VbBM3Ao9mrGjHvT3k72Y", label: "WhatsApp Channel" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-semibold text-accent">
              Stop Learning. Start Earning.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Quick links
            </h4>
            <ul className="mt-4 space-y-2">
              {QUICK.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Follow
            </h4>
            <ul className="mt-4 space-y-2">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground/80 transition-colors hover:text-accent"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2025 K2Ç Academy. All rights reserved. Knowledge to Cash Academy.
        </div>
      </div>
    </footer>
  );
}
