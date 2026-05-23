// Temporary placeholder — full LiveKit call UI lands in the new /student-portal (Phase 8).
import { Phone } from "lucide-react";

export function VoiceCallPanel(_props: { email: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Voice Coach</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        The new in-browser AI Coach call experience is moving to the upgraded Student Portal. Visit{" "}
        <a className="text-primary underline" href="/student-portal">/student-portal</a> to access it.
      </p>
    </div>
  );
}
