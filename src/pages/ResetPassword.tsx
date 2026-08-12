import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/constants";
import { Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, ArrowLeft } from "lucide-react";

const RECOVER_ACCOUNT_ENDPOINT = `${API_BASE_URL}/admin/auth/recover-account`;
const RESET_PASSWORD_ENDPOINT = `${API_BASE_URL}/admin/auth/reset-password`;

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location.search]);

  async function handleSendCode() {
    setError(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    setSendingCode(true);
    try {
      const url = new URL(RECOVER_ACCOUNT_ENDPOINT);
      url.searchParams.set("email", email.trim());

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Failed to send reset code.");
      }

      toast({
        title: "Reset code sent",
        description: body?.message || `A reset code was sent to ${email.trim()}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset code.";
      setError(message);
    } finally {
      setSendingCode(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (otp.trim().length !== 4) {
      setError("Enter the 4-character reset code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(RESET_PASSWORD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Failed to reset password.");
      }

      toast({
        title: "Password updated",
        description: body?.message || "Your admin password has been reset.",
      });
      navigate(`/login?reset=success&email=${encodeURIComponent(email.trim())}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground select-none overflow-hidden">
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#1766a4] to-[#207EC4] items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black/20 blur-3xl" />

        <div className="relative z-10 max-w-lg text-white space-y-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl">
            <ShieldCheck className="h-5 w-5 text-white" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Credential Recovery
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Restore admin access securely.
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              Request a recovery code, verify the OTP, and set a new password without going through the admin dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand text-white font-extrabold flex items-center justify-center text-xl shadow-md">
                O
              </div>
              <span className="text-xl font-bold tracking-wider text-foreground">ONEMAI</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground pt-2">
              Reset Password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your admin email, request the recovery code, then set a new password.
            </p>
          </div>

          <Card className="border border-border/80 shadow-lg rounded-2xl bg-card">
            <CardContent className="pt-6">
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@onemai.com"
                      className="pl-10 h-11 rounded-xl bg-background border-border/80 text-sm focus:border-brand"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">Send recovery code</p>
                    <p className="text-[11px] text-muted-foreground">
                      We’ll email a 4-character reset code to this admin account.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendCode}
                    disabled={sendingCode}
                    className="rounded-xl text-xs shrink-0"
                  >
                    {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Send Code
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">OTP Code</Label>
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(value) => setOtp(value.toUpperCase())}
                    pattern="^[A-Za-z0-9]+$"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-11 w-14 rounded-l-xl" />
                      <InputOTPSlot index={1} className="h-11 w-14" />
                      <InputOTPSlot index={2} className="h-11 w-14" />
                      <InputOTPSlot index={3} className="h-11 w-14 rounded-r-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs font-semibold">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10 h-11 rounded-xl bg-background border-border/80 text-sm focus:border-brand"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword((value) => !value)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10 h-11 rounded-xl bg-background border-border/80 text-sm focus:border-brand"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-sm shadow-md transition-all duration-200"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
