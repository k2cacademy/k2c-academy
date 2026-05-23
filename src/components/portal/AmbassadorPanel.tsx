import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getOrCreateMyAmbassador,
  getMyReferrals,
  updateAmbassadorBank,
} from "@/lib/ambassador.functions";

export function AmbassadorPanel() {
  const qc = useQueryClient();
  const create = useServerFn(getOrCreateMyAmbassador);
  const list = useServerFn(getMyReferrals);
  const saveBank = useServerFn(updateAmbassadorBank);
  const [copied, setCopied] = useState(false);
  const [bank, setBank] = useState({ bank_account_number: "", bank_code: "", account_name: "" });

  const ambQ = useQuery({ queryKey: ["ambassador"], queryFn: () => create() });
  const refsQ = useQuery({ queryKey: ["referrals"], queryFn: () => list() });

  const bankMut = useMutation({
    mutationFn: () => saveBank({ data: bank }),
    onSuccess: () => {
      toast.success("Bank info saved.");
      qc.invalidateQueries({ queryKey: ["ambassador"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const code = ambQ.data?.referral_code;
  const link = code ? `https://k2cacademy.lovable.app/signup?ref=${code}` : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <Users className="h-5 w-5 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Ambassador Program</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Earn <strong>₦2,000</strong> for every referred student who makes their first paid purchase. Share your link below.
      </p>

      {ambQ.data && (
        <>
          <div className="mt-4 flex items-center gap-2">
            <Input readOnly value={link} className="font-mono text-xs" />
            <Button onClick={copy} variant="outline" size="sm">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Referrals" value={ambQ.data.total_referrals} />
            <Stat label="Paid" value={ambQ.data.total_paid_referrals} />
            <Stat label="Earned" value={`₦${(ambQ.data.total_earned_ngn ?? 0).toLocaleString()}`} />
          </div>

          <details className="mt-4 group">
            <summary className="text-xs text-muted-foreground cursor-pointer">Bank info for payouts</summary>
            <div className="mt-3 space-y-2">
              <div>
                <Label className="text-xs">Account name</Label>
                <Input value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Account number</Label>
                  <Input value={bank.bank_account_number} onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })} maxLength={10} />
                </div>
                <div>
                  <Label className="text-xs">Bank code</Label>
                  <Input value={bank.bank_code} onChange={(e) => setBank({ ...bank, bank_code: e.target.value })} placeholder="e.g. 058" />
                </div>
              </div>
              <Button size="sm" onClick={() => bankMut.mutate()} disabled={bankMut.isPending}>
                {bankMut.isPending ? "Saving…" : "Save bank info"}
              </Button>
            </div>
          </details>

          {refsQ.data && refsQ.data.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Recent referrals</p>
              <ul className="space-y-1.5 text-xs">
                {refsQ.data.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-muted-foreground">
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span className={r.payout_status === "paid" ? "text-green-400" : r.qualified_at ? "text-yellow-400" : "text-muted-foreground"}>
                      {r.qualified_at ? r.payout_status : "pending qualification"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
