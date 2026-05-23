import { Calendar, Facebook, Instagram, Music2 } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { Button } from "@/components/ui/button";
import nathyPhoto from "@/assets/digital-nathy.jpg";
import dornuPhoto from "@/assets/dornu-esther.jpg";
import effaPhoto from "@/assets/effa-minka-aliche.jpg";
import eyongPhoto from "@/assets/eyong-goodnews.jpg";
import nnannaPhoto from "@/assets/nnanna-sunday-obi.jpg";
import basseyPhoto from "@/assets/bassey-esther.jpg";
import ezogoPhoto from "@/assets/ezogo-vincent.jpg";
import ayukPhoto from "@/assets/ayuk-felix.jpg";
import ukaegbuPhoto from "@/assets/ukaegbu-ifeoma.jpg";

const AMBASSADORS = [
  {
    name: "Dornu Esther",
    photo: dornuPhoto,
    role: "Ads Manager, K2Ç Academy",
    bio: "Founder & CEO of Bags — a Nigerian brand selling premium leather bags, shoes and more. At K2Ç Academy, Esther runs paid ads and helps students turn their offers into consistent online sales.",
  },
  {
    name: "Effa Minka Aliche",
    photo: effaPhoto,
    role: "Community Manager 1, K2Ç Academy",
    bio: "Seasoned affiliate marketer and sales & marketing strategist. Effa is building a podcast to coach upcoming entrepreneurs on making real money online, and leads community at K2Ç Academy.",
  },
  {
    name: "Eyong, Goodnews Ekpenyong",
    photo: eyongPhoto,
    role: "Community Manager 2, K2Ç Academy",
    bio: "Founder of Agogo Studio — an online studio creating stunning AI photo edits, AI motion and videos. Goodnews helps K2Ç Academy students show up online with scroll-stopping visuals that sell.",
  },
  {
    name: "Nnanna Sunday Obi",
    photo: nnannaPhoto,
    role: "Social Media Manager, K2Ç Academy",
    bio: "Seasoned social media manager and strategist. Nnanna runs the K2Ç Brand's social presence — turning content into community and community into customers.",
  },
  {
    name: "Bassey Esther",
    photo: basseyPhoto,
    role: "Virtual Assistant, K2Ç Academy",
    bio: "CEO of Blaq's Collection — a brand offering affordable, quality wears of all kinds. At K2Ç Academy, Esther serves as the Virtual Assistant, keeping operations smooth so students and the team stay focused on growth.",
  },
  {
    name: "Ezogo Vincent Joseph",
    photo: ezogoPhoto,
    role: "Graphic Designer, K2Ç Academy",
    bio: "Founder & CEO of Hydrogen Graphics. As an ambassador of K2Ç Academy, Vincent crafts stunning visual designs that help the brand and its students stand out and sell with confidence.",
  },
  {
    name: "Ayuk Felix",
    photo: ayukPhoto,
    role: "Cinematographer, K2Ç Academy",
    bio: "Seasoned photographer and CEO of FXstudio. As the cinematographer of the K2Ç brand, Felix captures the visuals and stories that bring the movement to life on screen.",
  },
  {
    name: "Ukaegbu Ifeoma",
    photo: ukaegbuPhoto,
    role: "Copywriter, K2Ç Academy",
    bio: "Cyber security intern, seasoned copywriter and renowned Amazon KDP guru / publisher. As the copywriter of the K2Ç brand, Ifeoma turns ideas into words that move people to take action and buy.",
  },
] as const;

export function Team() {
  return (
    <section id="team" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>The Coaches</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Learn from people <span className="text-primary">in the game</span>
          </h2>
        </div>

        {/* Digital Nathy card */}
        <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-border bg-card p-7 shadow-card sm:p-10">
          <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
            <div className="mx-auto sm:mx-0">
              <img
                src={nathyPhoto}
                alt="Digital Nathy — Founder of K2Ç Academy"
                loading="lazy"
                className="h-36 w-36 rounded-full object-cover shadow-glow ring-4 ring-primary/40 sm:h-44 sm:w-44 md:h-48 md:w-48"
              />
            </div>

            <div className="text-center sm:text-left">
              <h3 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Digital Nathy
              </h3>
              <p className="mt-1 text-sm font-bold text-primary">
                Founder, K2Ç Academy · Nigeria's First Sale Coach
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Founder of K2Ç Academy and Nigeria's First Sale Coach. Digital Nathy helps
                everyday Nigerians turn the skills they already have into real online income —
                no fluff, just frameworks that close sales. Thousands of students have used his
                playbook to hit their first ₦100k, ₦500k and ₦1m online.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Catch him live every Sunday at 8pm on WhatsApp for a free class.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <a href="https://chat.whatsapp.com/CrNR2l6QeOq5dqkLk7jlKf?mode=gi_t" target="_blank" rel="noopener noreferrer">
                    <Calendar className="mr-1.5 h-4 w-4" />
                    Free Sunday Class
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="border-border bg-transparent" asChild>
                  <a href="https://www.facebook.com/share/18VfV5h8jS/" target="_blank" rel="noopener noreferrer">
                    <Facebook className="mr-1.5 h-4 w-4" />
                    Facebook
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="border-border bg-transparent" asChild>
                  <a href="https://instagram.com/digitalnathy" target="_blank" rel="noopener noreferrer">
                    <Instagram className="mr-1.5 h-4 w-4" />
                    @digitalnathy
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="border-border bg-transparent" asChild>
                  <a href="https://tiktok.com/@digitalnathy" target="_blank" rel="noopener noreferrer">
                    <Music2 className="mr-1.5 h-4 w-4" />
                    @digitalnathy
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Ambassadors */}
        <div className="mt-20 text-center">
          <SectionLabel>Our Ambassadors</SectionLabel>
          <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl">
            The faces behind <span className="text-primary">the movement</span>
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Proven entrepreneurs who represent the K2Ç Academy standard — building real brands and
            helping students do the same.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {AMBASSADORS.map((a) => (
            <div
              key={a.name}
              className="rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-8"
            >
              <img
                src={a.photo}
                alt={`${a.name} — ${a.role}`}
                loading="lazy"
                className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-primary/40 sm:h-32 sm:w-32"
              />
              <h4 className="mt-5 font-display text-lg font-bold text-foreground">{a.name}</h4>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">
                {a.role}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{a.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
