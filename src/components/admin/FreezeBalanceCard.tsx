import { useState } from "react";
import { Loader2, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/constants";

/**
 * Admin / support freeze and unfreeze of a member's wallet balance
 * (freeze_and_unfreeze_balance_api_documentation.pdf, sections 5 and 6):
 *
 *   POST /user/admin/freeze-balance    { userId, otp }
 *   POST /user/admin/unfreeze-balance  { userId, otp }
 *
 * Both answered 404 on the server when this was built.
 *
 * The code is the member's own: the API gives an admin no way to send one for
 * another user. Plain fetch is used rather than apiFetch, which signs the
 * admin out on a 403 (here that only means the role is not allowed).
 */
export function FreezeBalanceCard({
  userId,
  frozen,
  onChange,
}: {
  userId: string;
  /** undefined when the user record does not report it. */
  frozen?: boolean;
  onChange: (frozen: boolean) => void;
}) {
  const { token, role } = useAuth();
  const { toast } = useToast();
  const [action, setAction] = useState<"freeze" | "unfreeze" | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (role !== "admin" && role !== "customer_support") return null;

  const open = (next: "freeze" | "unfreeze") => {
    setAction(next);
    setOtp("");
    setError("");
  };

  const submit = async () => {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/user/admin/${action}-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, otp }),
      });
      // A missing route answers with an HTML page; API errors are JSON.
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404 && !body) throw new Error("This action is not available on the server yet.");
        throw new Error(body?.message || `Request failed (${res.status})`);
      }
      const reported = body?.data?.user?.freezeBalance;
      const next = typeof reported === "boolean" ? reported : action === "freeze";
      onChange(next);
      toast({ title: next ? "Balance frozen" : "Balance unfrozen" });
      setAction(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Snowflake className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground block">Balance protection</span>
              <span className="text-xs text-muted-foreground">
                {frozen === undefined ? "Freeze status not reported" : frozen ? "Balance is frozen" : "Balance is not frozen"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {frozen !== true && (
              <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => open("freeze")}>
                Freeze balance
              </Button>
            )}
            {frozen !== false && (
              <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => open("unfreeze")}>
                Unfreeze balance
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {action && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full rounded-2xl border border-border shadow-2xl bg-card p-6">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base font-bold">
                {action === "freeze" ? "Freeze balance" : "Unfreeze balance"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Enter the 4-character balance verification code that was emailed to this member. It expires after 5
                minutes, and 5 wrong attempts lock verification for 15 minutes.
              </p>
              <div className="space-y-1.5">
                <Label className="font-semibold">Verification code</Label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4))}
                  className="h-10 rounded-xl font-mono uppercase tracking-widest"
                  placeholder="ABCD"
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button variant="ghost" size="sm" onClick={() => setAction(null)} disabled={busy} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                  onClick={submit}
                  disabled={busy || otp.length !== 4}
                >
                  {busy ? <Loader2 className="animate-spin h-4 w-4" /> : action === "freeze" ? "Freeze" : "Unfreeze"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
