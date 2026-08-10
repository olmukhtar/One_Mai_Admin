import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight, Loader2 } from "lucide-react";

import { AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
const LOGIN_URL = `${API_BASE_URL}/admin/auth/login`;

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string } | undefined;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("expired") === "true") {
      setError("Session expired. Please log in again.");
    }
  }, [location.search]);

  // useEffect(() => {
  //   const raw =
  //     localStorage.getItem(AUTH_STORAGE_KEY) ||
  //     sessionStorage.getItem(AUTH_STORAGE_KEY);
  //   if (raw) navigate("/dashboard", { replace: true });
  // }, [navigate]);

  const storage = useMemo(
    () => (remember ? localStorage : sessionStorage),
    [remember]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !pwd) {
      setError("Email and password required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });

      if (!res.ok) {
        let msg = `Login failed: ${res.status}`;
        try {
          const json = await res.json();
          if (json?.message) msg = `Login failed: ${json.message}`;
          else if (json?.error) msg = `Login failed: ${json.error}`;
        } catch { }
        setError(msg);
        setLoading(false);
        return;
      }

      const response = await res.json();
      const data = response.data;

      const token =
        data?.token || data?.accessToken || data?.access_token || "";
      const admin = data?.admin;

      if (!token) {
        setError("Login succeeded but no token returned by server.");
        setLoading(false);
        return;
      }

      login({
        token,
        role: admin?.role,
        user: {
          id: admin?.id,
          name: admin?.name,
          email: admin?.email,
          role: admin?.role
        },
      }, remember);

      const params = new URLSearchParams(location.search);
      const fromParam = params.get("from");
      const redirectPath =
        state?.from || (fromParam ? decodeURIComponent(fromParam) : "/dashboard");

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? `Network error: ${err.message}` : "Network error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground select-none overflow-hidden">
      {/* Left Artwork Panel */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#1766a4] to-[#207EC4] items-center justify-center p-12 overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black/20 blur-3xl" />

        <div className="relative z-10 max-w-lg text-white space-y-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl">
            <Shield className="h-5 w-5 text-white" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Secure Operations Portal
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Manage Onemai Financial Ecosystem with Ease.
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              Real-time user analytics, group contribution tracking, monify payouts, partner approvals, and comprehensive financial reports.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <span className="block text-2xl font-bold">100%</span>
              <span className="text-xs text-white/70">Encrypted Transactions</span>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <span className="block text-2xl font-bold">Role-Based</span>
              <span className="text-xs text-white/70">Granular Access Control</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand text-white font-extrabold flex items-center justify-center text-xl shadow-md">
                O
              </div>
              <span className="text-xl font-bold tracking-wider text-foreground">
                ONEMAI
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground pt-4">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your authorized admin credentials.
            </p>
          </div>

          {/* Form Card */}
          <Card className="border border-border/80 shadow-lg rounded-2xl bg-card">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="admin@onemai.com"
                      className="pl-10 h-11 rounded-xl bg-background border-border/80 text-sm focus:border-brand"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11 rounded-xl bg-background border-border/80 text-sm focus:border-brand"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPwd((v) => !v)}
                    >
                      {showPwd ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(Boolean(v))}
                    />
                    Remember session
                  </label>
                </div>

                {error && (
                  <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-sm shadow-md transition-all duration-200 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  Restricted access. All actions are logged and audited.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}