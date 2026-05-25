import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/site/Logo";
import { Trophy, Gift, LogOut, Award, Sparkles, Cake } from "lucide-react";
import { toast } from "sonner";
import {
  getMyProfile,
  completeOnboarding,
  markFirstSale,
  getMyCertificates,
  getMyBirthdayGifts,
} from "@/lib/portal.functions";
import { VoiceCallPanel } from "@/components/portal/VoiceCallPanel";
import { AmbassadorPanel } from "@/components/portal/AmbassadorPanel";
import { BookEditorPanel } from "@/components/portal/BookEditorPanel";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Student Portal — K2Ç Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchCerts = useServerFn(getMyCertificates);
  const fetchGifts = useServerFn(getMyBirthdayGifts);
  const submitOnboarding = useServerFn(completeOnboarding);
  const submitFirstSale = useServerFn(markFirstSale);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const certsQ = useQuery({ queryKey: ["certs"], queryFn: () => fetchCerts() });
  const giftsQ = useQuery({ queryKey: ["gifts"], queryFn: () => fetchGifts() });

  const onboardMut = useMutation({
    mutationFn: (data: OnboardingData) => submitOnboarding({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstSaleMut = useMutation({
    mutationFn: () => submitFirstSale(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["certs"] });
      if (res.alreadyIssued) toast.info("Certificate already issued.");
      else toast.success("🎉 Your certificate is ready!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (profileQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }

  const profile = profileQ.data;
  const needsOnboarding = profile && !profile.onboarding_complete;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Logo />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Your K2Ç Academy student portal.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* First Sale card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">First Sale Certificate</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Made your first online sale? Claim your official K2Ç Academy certificate — emailed to you instantly.
            </p>

            {profile?.certificate_issued ? (
              <div className="mt-4 space-y-2">
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-200 flex items-center gap-2">
                  <Award className="h-4 w-4" /> Certificate issued 🎉
                </div>
                {certsQ.data?.[0] && (
                  <Button asChild className="w-full bg-primary text-primary-foreground">
                    <a href={certsQ.data[0].pdf_url} target="_blank" rel="noopener noreferrer">
                      Download certificate
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={() => firstSaleMut.mutate()}
                disabled={firstSaleMut.isPending || needsOnboarding}
                className="mt-4 w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold hover:from-yellow-400 hover:to-yellow-300"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {firstSaleMut.isPending ? "Generating…" : "I just made my first sale!"}
              </Button>
            )}
          </div>

          <VoiceCallPanel
            email={(typeof window !== "undefined" && (supabase.auth as unknown as { _user?: { email?: string } })?._user?.email) || ""}
          />
          <AmbassadorPanel />

          {/* Birthday card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-500/15 flex items-center justify-center">
                <Cake className="h-5 w-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Birthday Gift 🎂</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Get <strong>250MB free data</strong> automatically sent to your phone on your birthday — every year, on us.
            </p>
            {profile?.birthday ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Birthday: <span className="text-foreground font-medium">{profile.birthday}</span> · Network: <span className="text-foreground font-medium">{profile.network}</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-yellow-400">Add your birthday & network in your profile to unlock this.</p>
            )}

            {giftsQ.data && giftsQ.data.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Recent gifts</p>
                {giftsQ.data.slice(0, 3).map((g) => (
                  <div key={g.id} className="text-xs text-muted-foreground flex items-center gap-2">
                    <Gift className="h-3 w-3" />
                    {new Date(g.sent_at).toLocaleDateString()} — {g.amount_mb}MB ({g.status})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {needsOnboarding && (
        <OnboardingDialog
          defaultName={profile?.full_name ?? ""}
          onSubmit={(data) => onboardMut.mutateAsync(data)}
          submitting={onboardMut.isPending}
        />
      )}
    </div>
  );
}

interface OnboardingData {
  full_name: string;
  whatsapp: string;
  phone_number: string;
  network: "MTN" | "Glo" | "Airtel" | "9mobile";
  birthday: string;
}

function OnboardingDialog({
  defaultName,
  onSubmit,
  submitting,
}: {
  defaultName: string;
  onSubmit: (d: OnboardingData) => Promise<unknown>;
  submitting: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState<OnboardingData>({
    full_name: defaultName,
    whatsapp: "",
    phone_number: "",
    network: "MTN",
    birthday: "",
  });

  useEffect(() => {
    setForm((f) => ({ ...f, full_name: defaultName || f.full_name }));
  }, [defaultName]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(form);
      setOpen(false);
    } catch {
      /* toast handled in mutation */
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* lock until completed */ }}>
      <DialogContent className="bg-card border-border" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to K2Ç Academy 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Quick profile setup so we can send your birthday data gift and tag your wins.
        </p>
        <form onSubmit={handle} className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>WhatsApp number</Label>
            <Input required placeholder="+234…" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone (data)</Label>
              <Input required placeholder="08012345678" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            </div>
            <div>
              <Label>Network</Label>
              <select
                required
                value={form.network}
                onChange={(e) => setForm({ ...form, network: e.target.value as OnboardingData["network"] })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="MTN">MTN</option>
                <option value="Glo">Glo</option>
                <option value="Airtel">Airtel</option>
                <option value="9mobile">9mobile</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Birthday</Label>
            <Input type="date" required value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground">
            {submitting ? "Saving…" : "Continue to portal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
