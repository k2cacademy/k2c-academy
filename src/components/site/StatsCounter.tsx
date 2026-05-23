import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 150, suffix: "+", label: "Students Trained" },
  { value: 80, suffix: "+", label: "First Sales Made" },
  { value: 7, suffix: "", label: "Core Modules" },
  { value: 100, suffix: "%", label: "Practical" },
];

function useCountUp(target: number, start: boolean, duration = 1500) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return n;
}

function Stat({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const n = useCountUp(value, start);
  return (
    <div className="text-center">
      <div className="font-display text-4xl font-bold text-accent sm:text-5xl md:text-6xl">
        {n}
        {suffix}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/80 sm:text-sm">
        {label}
      </div>
    </div>
  );
}

export function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStart(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden bg-gradient-purple py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0_0_0/.0)_0%,_oklch(0_0_0/.4)_100%)]" />
      <div className="relative mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} start={start} />
        ))}
      </div>
    </section>
  );
}
