import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, ShieldCheck, AlertTriangle, XCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { verifyPayment } from "@/lib/payment-verify.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-payment")({
  component: VerifyPaymentPage,
  head: () => ({
    meta: [
      { title: "Verify Your Payment — K2Ç Academy" },
      { name: "description", content: "Upload your bank transfer receipt and get instant access to K2Ç Academy." },
    ],
  }),
});

type Result = Awaited<ReturnType<typeof verifyPayment>>;

function VerifyPaymentPage() {
  const verifyFn = useServerFn(verifyPayment);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const copyAccount = () => {
    navigator.clipboard.writeText("6450987909");
    toast.success("Account number copied!");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload your receipt.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      // 1. Upload receipt
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file, {
        contentType: file.type,
      });
      if (upErr) throw new Error(upErr.message);

      // 2. Run verification
      const res = await verifyFn({
        data: {
          full_name: String(fd.get("full_name")),
          email: String(fd.get("email")),
          whatsapp: String(fd.get("whatsapp")),
          network: (fd.get("network") as "MTN" | "Glo" | "Airtel" | "9mobile") || undefined,
          payment_type: fd.get("payment_type") as "course" | "inner_circle" | "inner_circle_founding",
          receipt_path: path,
          receipt_mime: file.type || "image/jpeg",
        },
      });
      setResult(res);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. WhatsApp 09164266235 and we'll help.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const isSuccess = result.status === "review";
    const isError =
      result.status === "rejected" || result.status === "duplicate" || result.status === "error";
    const tone = isSuccess
      ? "border-green-500/40 bg-green-500/10"
      : isError
      ? "border-red-500/40 bg-red-500/10"
      : "border-orange-500/40 bg-orange-500/10";
    const Icon = isSuccess ? ShieldCheck : isError ? XCircle : AlertTriangle;
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-foreground">
        <div className="mx-auto max-w-lg">
          <div className={`rounded-2xl border p-8 text-center ${tone}`}>
            <Icon className="mx-auto h-12 w-12 text-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold">{result.message}</h1>
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild className="bg-primary text-primary-foreground">
                <a href="https://wa.me/2349164266235" target="_blank" rel="noopener noreferrer">
                  WhatsApp Us
                </a>
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setFile(null); }}>
                Submit another receipt
              </Button>
              <Link to="/" className="text-sm text-muted-foreground underline">Back home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="text-sm text-muted-foreground underline">← Back home</Link>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Verify Your Payment 🔐</h1>
        <p className="mt-2 text-muted-foreground">Upload your receipt and get instant access.</p>

        <div className="mt-6 rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Pay to</p>
          <p className="mt-2 text-sm text-muted-foreground">Bank: <span className="text-foreground">Moniepoint MFB</span></p>
          <p className="text-sm text-muted-foreground">Account name: <span className="text-foreground">Emmanuel Oniah</span></p>
          <button
            type="button"
            onClick={copyAccount}
            className="mt-2 flex items-center gap-2 font-display text-xl font-bold text-accent hover:underline"
          >
            6450987909 <Copy className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" name="full_name" required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required maxLength={255} />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" required maxLength={20} />
          </div>
          <div>
            <Label htmlFor="network">Network</Label>
            <Select name="network">
              <SelectTrigger><SelectValue placeholder="Select your network" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MTN">MTN</SelectItem>
                <SelectItem value="Glo">Glo</SelectItem>
                <SelectItem value="Airtel">Airtel</SelectItem>
                <SelectItem value="9mobile">9mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="payment_type">Payment Type</Label>
            <Select name="payment_type" defaultValue="course" required>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Course — ₦9,997</SelectItem>
                <SelectItem value="inner_circle">Inner Circle — ₦1,000</SelectItem>
                <SelectItem value="inner_circle_founding">Inner Circle Founding — ₦800</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Receipt (JPG, PNG, or PDF)</Label>
            <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/30 px-4 py-8 text-sm text-muted-foreground hover:border-accent">
              <Upload className="h-5 w-5" />
              {file ? file.name : "Tap to upload your receipt"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? "Verifying…" : "Verify My Payment ✅"}
          </Button>
        </form>
      </div>
    </div>
  );
}
