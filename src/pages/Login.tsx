import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import { AUTH_STORAGE_KEY } from "@/lib/api";
const LOGIN_URL = "https://api.joinonemai.com/api/admin/auth/login";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { from?: string } };

  useEffect(() => {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) ||
      sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) navigate("/dashboard", { replace: true });
  }, [navigate]);

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

      const data = await res.json();
      // Expected response:
      // {
      //   message: "Login successful",
      //   token: "...",
      //   admin: { id, name, email, role }
      // }
      const token =
        data?.token || data?.accessToken || data?.access_token || "";
      const admin = data?.admin || data?.user || { email };

      if (!token) {
        setError("Login succeeded but no token returned by server.");
        setLoading(false);
        return;
      }

      // Store auth data with role at top level for easy access across the app
      storage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token,
          role: admin?.role || "admin", // Store role at top level for consistency
          user: {
            id: admin?.id || admin?._id,
            name: admin?.name || `${admin?.firstName ?? ""} ${admin?.lastName ?? ""}`.trim() || admin?.email || email,
            email: admin?.email || email,
            role: admin?.role || "admin",
          },
        })
      );

      navigate(state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? `Network error: ${err.message}` : "Network error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-[#207EC4]">
        <div className="max-w-md px-10 text-white">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
            <span className="text-[#207EC4] font-bold">A</span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold">Admin Panel</h1>
          <p className="mt-2 text-white/80">Authorized admins only.</p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center px-6">
        <Card className="w-full max-w-md border border-slate-200 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <p className="text-sm text-slate-600">
              Use the credentials provided by your organization.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@company.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    className="pl-9 pr-10"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-700"
                    onClick={() => setShowPwd((v) => !v)}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(Boolean(v))}
                  />
                  Remember me
                </label>
                <span className="text-sm text-slate-400 select-none">
                  Forgot password?
                </span>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#207EC4] hover:bg-[#1c6fb0]"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Access restricted to authorized admins.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}