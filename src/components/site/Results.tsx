import { useEffect, useState } from "react";
import { Star, BadgeCheck, Camera } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ShareWinModal, ProofLightbox } from "./ShareWinModal";

type StudentResult = {
  id: string;
  full_name: string;
  what_they_sell: string;
  win_story: string;
  sale_amount: number | null;
  profile_photo_url: string;
  proof_image_url: string | null;
  star_rating: number;
  date_submitted: string;
};

const FALLBACK: StudentResult[] = [
  {
    id: "founder",
    full_name: "Digital Nathy",
    what_they_sell: "Founder, K2Ç Academy",
    win_story:
      "K2Ç Academy isn't about more lessons — it's about your first real result. Watch this space as student wins start dropping in.",
    sale_amount: null,
    profile_photo_url: "",
    proof_image_url: null,
    star_rating: 5,
    date_submitted: new Date().toISOString(),
  },
];

function formatNaira(n: number) {
  return new Intl.NumberFormat("en-NG").format(n);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Results() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("student_results")
        .select("*")
        .eq("is_verified", true)
        .order("date_submitted", { ascending: false })
        .limit(50);
      if (!active) return;
      setResults((data as StudentResult[]) || []);
      setLoaded(true);
    })();

    const channel = supabase
      .channel("student_results_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "student_results" },
        (payload) => {
          const row = payload.new as StudentResult;
          setResults((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const display = loaded && results.length > 0 ? results : FALLBACK;

  return (
    <section id="results" className="relative bg-card/30 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Student Results</SectionLabel>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Real people. <span className="text-primary">Real first sales.</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            These are the wins that drive everything at K2Ç Academy. Your name could be next.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card/60 p-5 text-center text-sm text-muted-foreground">
          Every win you see here was submitted by a verified K2Ç student using our authenticated
          results system.{" "}
          <span className="text-foreground">We don't fake results — we engineer them.</span>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            className="bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
            onClick={() => setShareOpen(true)}
          >
            Share your story
          </Button>
        </div>

        <div className="-mx-4 mt-12 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
          <div className="flex gap-5 snap-x snap-mandatory">
            {display.map((r) => (
              <article
                key={r.id}
                className="flex w-[88vw] max-w-sm flex-shrink-0 snap-start flex-col rounded-3xl border border-border bg-card p-6 shadow-card sm:w-96 sm:p-7"
              >
                <div className="flex items-center gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={
                        j < r.star_rating
                          ? "h-4 w-4 fill-current"
                          : "h-4 w-4 text-muted-foreground"
                      }
                    />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                  "{r.win_story}"
                </p>
                {r.sale_amount != null && (
                  <p className="mt-3 text-sm font-bold text-accent">
                    First Sale: ₦{formatNaira(r.sale_amount)}
                  </p>
                )}
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  {r.profile_photo_url ? (
                    <img
                      src={r.profile_photo_url}
                      alt={r.full_name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-purple text-sm font-bold text-primary-foreground">
                      {initials(r.full_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.what_they_sell}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified K2Ç Student
                  </span>
                  {r.proof_image_url && (
                    <button
                      type="button"
                      onClick={() => setLightbox(r.proof_image_url)}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/25"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      📸 Sale Proof Available
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <ShareWinModal open={shareOpen} onOpenChange={setShareOpen} />
      <ProofLightbox
        src={lightbox}
        open={!!lightbox}
        onOpenChange={(v) => !v && setLightbox(null)}
      />
    </section>
  );
}
