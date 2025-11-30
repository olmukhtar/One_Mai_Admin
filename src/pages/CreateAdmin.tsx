// src/pages/CreateAdmin.tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type UserRole = "admin" | "account" | "front_desk" | "customer_support" | "marketing";

const AUTH_KEY = "admin_auth";
const BASE = "https://api.joinonemai.com/api";
const ENDPOINT = `${BASE}/admin/auth/create-admin`;
const ROLES_ENDPOINT = `${BASE}/admin/auth/get-roles`;

interface Role {
  label: string;
  value: string;
}

function useToken() {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.token as string | null;
    } catch {
      return null;
    }
  }, []);
}

function useUserRole(): UserRole | null {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.role as UserRole) || null;
    } catch {
      return null;
    }
  }, []);
}

export default function CreateAdmin() {
  const token = useToken();
  const role = useUserRole();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Check if user has permission to access this page
  // Only admin role can create new admin accounts
  const hasAccess = role === "admin";

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/create-admin" } });
    }
  }, [token, navigate]);

  // Fetch roles on mount
  useEffect(() => {
    async function fetchRoles() {
      if (!token || !hasAccess) {
        setLoadingRoles(false);
        return;
      }

      try {
        const res = await fetch(ROLES_ENDPOINT, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch roles: ${res.status}`);
        }

        const data = await res.json();
        if (data.roles && Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load roles");
      } finally {
        setLoadingRoles(false);
      }
    }

    fetchRoles();
  }, [token, hasAccess]);

  function validate() {
    if (!name.trim()) return "Name is required";
    if (!email.trim()) return "Email is required";
    // simple email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email";
    if (!password || password.length < 8) return "Password must be at least 8 characters";
    if (!selectedRole) return "Role is required";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Double-check permissions before submitting
    if (!hasAccess) {
      const m = "You don't have permission to create admin accounts";
      setErr(m);
      toast.error(m);
      return;
    }

    const v = validate();
    if (v) {
      setErr(v);
      toast.error(v);
      return;
    }
    if (!token) {
      const m = "Missing auth token. Sign in again.";
      setErr(m);
      toast.error(m);
      return;
    }

    setErr(null);
    setSubmitting(true);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: selectedRole
        }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // not JSON, ignore
      }

      if (!res.ok) {
        const msg = json?.message || `Failed to create admin: ${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }

      toast.success("Admin created successfully");
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setSelectedRole("");
      // optional: navigate to Users or Dashboard
      // navigate("/users");
    } catch (e: any) {
      const msg = e?.message || "Request failed";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // If user doesn't have access, show permission denied message
  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Create Admin"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Create Admin" }]}
            searchPlaceholder=""
            showSearch={false}
          />

          <Card className="max-w-2xl border border-slate-100 shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-red-100 p-3 mb-4">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Access Denied
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md">
                  You don't have permission to create admin accounts. This feature is only available to users with Admin role.
                </p>
                <Button onClick={() => navigate("/dashboard")} variant="outline">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Create Admin"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Create Admin" }]}
          searchPlaceholder=""
          showSearch={false}
        />

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {err}
          </div>
        )}

        <Card className="max-w-2xl border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">New Admin Account</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole} disabled={loadingRoles}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label.charAt(0).toUpperCase() + r.label.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={submitting || loadingRoles}>
                  {submitting ? "Creating…" : "Create Admin"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}