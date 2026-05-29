import { useEffect, useRef, useState } from "react";
import { Lock, Star, Loader2, Upload, CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "verify" | "form" | "success";

// Normalise code so K2Ç-STUDENT and K2C-STUDENT both work
function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/Ç/g, "C").replace(/ç/g, "C");
}

export function ShareWinModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("verify");
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [fullName, setFullName] = useState("");
  const [whatTheySell, setWhatTheySell] = useState("");
  const [winStory, setWinStory] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [stars, setStars] = useState(5);
  const [confirmReal, setConfirmReal] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      closeTimer.current && window.clearTimeout(closeTimer.current);
      setTimeout(() => {
        setStep("verify");
        setCode("");
        setVerifyError(null);
        setFullName("");
        setWhatTheySell("");
        setWinStory("");
        setSaleAmount("");
        setStars(5);
        setConfirmReal(false);
        setProfileFile(null);
        setProfilePreview(null);
        setProofFile(null);
        setProofPreview(null);
      }, 200);
    }
  }, [open]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifying(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "student_verification_code")
      .maybeSingle();
    setVerifying(false);
    if (error) {
      setVerifyError("Couldn't verify right now. Please try again in a moment.");
      return;
    }
    const configured = (data?.value || "").trim();
    const normalise = (s: string) =>
      s.trim().toUpperCase().replace(/Ç/g, "C").replace(/ç/g, "C");
    const accepted = new Set(
      ["K2C-STUDENT", "K2Ç-STUDENT", configured]
        .filter(Boolean)
        .map(normalise)
    );
    if (accepted.has(normalise(code))) {
      setStep("form");
    } else {
      setVerifyError(
        "That code doesn't match. Only verified K2Ç students can share results here. Check your purchase confirmation.",
      );
    }
  };

  const onPickProfile = (file: File | null) => {
    setProfileFile(file);
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview(file ? URL.createObjectURL(file) : null);
  };

  const onPickProof = (file: File | null) => {
    setProofFile(file);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadFile = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("student-results")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("student-results").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFile) {
      toast.error("Please upload your profile photo");
      return;
    }
    if (!confirmReal) {
      toast.error("Please confirm your win is real");
      return;
    }
    setSubmitting(true);
    try {
      const profileUrl = await uploadFile(profileFile, "profile");
      const proofUrl = proofFile ? await uploadFile(proofFile, "proof") : null;

      const { error } = await supabase.from("student_results").insert({
        full_name: fullName.trim(),
        what_they_sell: whatTheySell.trim(),
        win_story: winStory.trim(),
        sale_amount: saleAmount ? Number(saleAmount) : null,
        profile_photo_url: profileUrl,
        proof_image_url: proofUrl,
        star_rating: stars,
        is_verified: true,
      });
      if (error) throw error;

      setStep("success");
      closeTimer.current = window.setTimeout(() => {
        onOpenChange(false);
      }, 3000);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/40 bg-[#1a0b2e] p-0 text-foreground sm:max-w-lg">
        <div className="bg-gradient-to-br from-primary/30 via-[#1a0b2e] to-[#0f0820] p-6 sm:p-8">
          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <Lock className="h-7 w-7" />
                </div>
                <DialogTitle className="mt-4 font-display text-2xl font-bold text-foreground">
                  Verify You Are a K2Ç Student
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  Enter your student code to share your win.
                </DialogDescription>
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-12 border-border bg-background/60 pl-9 text-base"
                  aria-label="Student code"
                  placeholder="Enter your student code"
                />
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Your code is{" "}
                <span className="font-bold text-accent">K2C-STUDENT</span>
              </p>

              {verifyError && (
                <p className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
                  {verifyError}
                </p>
              )}

              <Button
                type="submit"
                disabled={verifying || code.trim().length === 0}
                className="h-12 w-full bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Me"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Don't have a code?{" "}
                <a
                  href="https://wa.me/2349164266235?text=Hi%20Nathy!%20I%20want%20to%20share%20my%20K2%C3%87%20win%20but%20I%20don't%20have%20a%20code."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#FACC15] hover:underline"
                >
                  WhatsApp us 💬
                </a>
              </p>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <DialogTitle className="font-display text-2xl font-bold text-foreground">
                  Share Your Win With the World! 🏆
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Your result will be published automatically on the K2Ç Academy website.
                </DialogDescription>
              </div>

              <div>
                <Label htmlFor="sw-name">Full name</Label>
                <Input
                  id="sw-name"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 border-border bg-background/60"
                />
              </div>

              <div>
                <Label htmlFor="sw-sell">What do you sell?</Label>
                <Input
                  id="sw-sell"
                  required
                  maxLength={120}
                  value={whatTheySell}
                  onChange={(e) => setWhatTheySell(e.target.value)}
                  className="mt-1.5 border-border bg-background/60"
                />
              </div>

              <div>
                <Label htmlFor="sw-win">Your Win — tell us what you achieved</Label>
                <Textarea
                  id="sw-win"
                  required
                  rows={4}
                  maxLength={1200}
                  value={winStory}
                  onChange={(e) => setWinStory(e.target.value)}
                  placeholder="e.g. I made my first ₦8,500 sale in 3 days using the WhatsApp script from Module 5..."
                  className="mt-1.5 border-border bg-background/60"
                />
              </div>

              <div>
                <Label htmlFor="sw-amount">How much was your first sale? (optional)</Label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-accent">
                    ₦
                  </span>
                  <Input
                    id="sw-amount"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    className="border-border bg-background/60 pl-7"
                  />
                </div>
              </div>

              <div>
                <Label>Upload your profile photo</Label>
                <div className="mt-1.5 flex items-center gap-4">
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/50 bg-background/40 hover:border-primary">
                    {profilePreview ? (
                      <img src={profilePreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickProfile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Required. A clear circular photo of you.
                  </p>
                </div>
              </div>

              <div>
                <Label>Upload proof of your sale (payment screenshot, bank alert etc.)</Label>
                <div className="mt-1.5 flex items-center gap-4">
                  <label className="flex h-20 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-background/40 hover:border-primary">
                    {proofPreview ? (
                      <img src={proofPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickProof(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Optional. Adds a "Sale Proof" badge to your card.
                  </p>
                </div>
              </div>

              <div>
                <Label>Rate your K2Ç Academy experience</Label>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStars(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          n <= stars ? "fill-accent text-accent" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
                <Checkbox
                  checked={confirmReal}
                  onCheckedChange={(v) => setConfirmReal(Boolean(v))}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground">
                  I confirm this result is real and I am a verified K2Ç student.
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full bg-[#FACC15] text-base font-bold text-[#1a0b2e] shadow-[0_10px_30px_-5px_rgba(250,204,21,0.5)] hover:bg-[#facc15]/90"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Publish My Win! 🚀</>
                )}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                🎉 Your win has been published!
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Scroll down to see it live on the website. You are officially part of the
                K2Ç Winners Circle!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProofLightbox({
  src,
  open,
  onOpenChange,
}: {
  src: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black p-0">
        <DialogTitle className="sr-only">Sale proof</DialogTitle>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {src && <img src={src} alt="Sale proof" className="h-auto w-full rounded-md" />}
      </DialogContent>
    </Dialog>
  );
}
