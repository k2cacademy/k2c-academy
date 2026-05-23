import logoImg from "@/assets/k2c-logo.jpg";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoImg}
        alt="K2Ç Academy logo"
        className="h-10 w-10 rounded-lg object-cover shadow-glow ring-1 ring-primary/40 sm:h-11 sm:w-11"
        loading="eager"
      />
      <div className="flex flex-col leading-none">
        <span className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
          K2Ç Academy
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Knowledge to Cash
        </span>
      </div>
    </div>
  );
}
