import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, UserPlus, ShieldCheck, KeyRound, MailCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "admin" | "account" | "front_desk" | "customer_support" | "marketing";

interface AdminUser {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  createdAt: string;
}

const BASE = API_BASE_URL;
const CREATE_ENDPOINT = `${BASE}/admin/auth/create-admin`;
const FETCH_ADMINS_ENDPOINT = `${BASE}/admin/fetch-admins`;
const UPDATE_ENDPOINT = (id: string) => `${BASE}/admin/update-admins/${id}`;
const DELETE_ENDPOINT = (id: string) => `${BASE}/admin/delete-admins/${id}`;
const ROLES_ENDPOINT = `${BASE}/admin/auth/get-roles`;
const RECOVER_ACCOUNT_ENDPOINT = `${BASE}/admin/auth/recover-account`;
const RESET_PASSWORD_ENDPOINT = `${BASE}/admin/auth/reset-password`;

interface Role {
  label: string;
  value: string;
}

export default function CreateAdmin() {
  const { token, role: currentUserRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [updating, setUpdating] = useState(false);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resettingAdmin, setResettingAdmin] = useState<AdminUser | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [sendingResetCode, setSendingResetCode] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/create-admin" } });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      setLoadingRoles(false);
      setLoadingAdmins(false);
      return;
    }

    async function fetchData() {
      try {
        const roleRes = await apiFetch(ROLES_ENDPOINT);
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          const rolesList = roleData.data?.roles || roleData.roles;
          if (rolesList && Array.isArray(rolesList)) {
            setRoles(rolesList);
          }
        }

        const adminRes = await apiFetch(FETCH_ADMINS_ENDPOINT);
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          const actualData = adminData.data || adminData;
          const list = actualData.admins || actualData || [];
          if (Array.isArray(list)) {
            setAdmins(list);
          }
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: "Failed to load admin user directory.",
          variant: "destructive",
        });
      } finally {
        setLoadingRoles(false);
        setLoadingAdmins(false);
      }
    }

    fetchData();
  }, [token]);

  async function refreshAdmins() {
    try {
      const adminRes = await apiFetch(FETCH_ADMINS_ENDPOINT);
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const actualData = adminData.data || adminData;
        const list = actualData.admins || actualData || [];
        if (Array.isArray(list)) {
          setAdmins(list);
        }
      }
    } catch {}
  }

  function validateCreate() {
    if (!name.trim()) return "Full name is required";
    if (!email.trim()) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address";
    if (!password || password.length < 8) return "Password must be at least 8 characters";
    if (!selectedRole) return "Admin role is required";
    return null;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    const v = validateCreate();
    if (v) {
      setErr(v);
      toast({ title: "Validation Error", description: v, variant: "destructive" });
      return;
    }

    setErr(null);
    setSubmitting(true);

    try {
      const res = await apiFetch(CREATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: selectedRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to create admin");
      }

      toast({
        title: "Admin Account Created",
        description: `Successfully provisioned ${email} as ${selectedRole}.`,
      });

      setName("");
      setEmail("");
      setPassword("");
      setSelectedRole("");
      refreshAdmins();
    } catch (e: any) {
      setErr(e.message);
      toast({ title: "Creation Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(admin: AdminUser) {
    if (!confirm(`Permanently remove admin account for ${admin.name || admin.email}?`)) return;

    try {
      const res = await apiFetch(DELETE_ENDPOINT(admin._id), {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete admin");
      }

      toast({
        title: "Admin Removed",
        description: "Administrative account deleted.",
      });
      refreshAdmins();
    } catch (e: any) {
      toast({ title: "Deletion Error", description: e.message, variant: "destructive" });
    }
  }

  function openEdit(admin: AdminUser) {
    setEditingAdmin(admin);
    setEditName(admin.name || `${admin.firstName || ""} ${admin.lastName || ""}`.trim());
    setEditEmail(admin.email);
    setEditRole(admin.role);
    setIsEditOpen(true);
  }

  function openReset(admin: AdminUser) {
    setResettingAdmin(admin);
    setResetEmail(admin.email);
    setResetOtp("");
    setResetPassword("");
    setResetConfirmPassword("");
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
    setIsResetOpen(true);
  }

  async function onSendResetCode() {
    if (!resetEmail.trim()) {
      toast({
        title: "Email required",
        description: "Choose an admin account with a valid email address first.",
        variant: "destructive",
      });
      return;
    }

    setSendingResetCode(true);
    try {
      const url = new URL(RECOVER_ACCOUNT_ENDPOINT);
      url.searchParams.set("email", resetEmail.trim());

      const res = await apiFetch(url.toString(), { method: "GET" });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to send password reset code.");
      }

      toast({
        title: "Reset code sent",
        description: body?.message || `A reset code was sent to ${resetEmail.trim()}.`,
      });
    } catch (e: any) {
      toast({
        title: "Unable to send code",
        description: e?.message || "The reset email could not be sent.",
        variant: "destructive",
      });
    } finally {
      setSendingResetCode(false);
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!resetEmail.trim()) {
      toast({ title: "Email required", description: "Reset email is missing.", variant: "destructive" });
      return;
    }
    if (resetOtp.trim().length !== 4) {
      toast({ title: "OTP required", description: "Enter the 4-digit reset code.", variant: "destructive" });
      return;
    }
    if (!resetPassword || resetPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      toast({ title: "Passwords do not match", description: "Confirm the same new password.", variant: "destructive" });
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await apiFetch(RESET_PASSWORD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
          newPassword: resetPassword,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to reset password.");
      }

      toast({
        title: "Password reset",
        description: body?.message || `Password updated for ${resetEmail.trim()}.`,
      });
      setIsResetOpen(false);
      setResettingAdmin(null);
    } catch (e: any) {
      toast({
        title: "Reset failed",
        description: e?.message || "The password could not be updated.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReset(false);
    }
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAdmin) return;

    setUpdating(true);
    try {
      const res = await apiFetch(UPDATE_ENDPOINT(editingAdmin._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to update admin");
      }

      toast({
        title: "Admin Updated",
        description: `Account permissions saved for ${editEmail}.`,
      });
      setIsEditOpen(false);
      setEditingAdmin(null);
      refreshAdmins();
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  }



  const columns = [
    {
      key: "name",
      label: "Admin Officer",
      render: (_: any, row: AdminUser) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
            {(row.name || row.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs text-foreground">{row.name || "—"}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Assigned Role",
      render: (v: string) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-bold text-[11px]">
          <ShieldCheck className="h-3 w-3" /> {v}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date Created",
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">
          {v ? new Date(v).toLocaleDateString("en-NG", { month: "short", day: "2-digit", year: "numeric" }) : "—"}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Administrative Access Control"
          subtitle="Provision new team members, grant RBAC privileges, and manage admin accounts."
          breadcrumbs={[{ label: "Admin Management" }]}
        />

        {/* Provision Form Card */}
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-6">
          <div className="border-b border-border/60 pb-3 mb-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand" /> Provision New Administrator
            </h3>
          </div>

          {err && (
            <div className="mb-4 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60">
              {err}
            </div>
          )}

          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Officer Full Name"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@onemai.ng"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Initial Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Privilege Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={loadingRoles}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
                  <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select Role"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label.charAt(0).toUpperCase() + r.label.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 px-5 bg-brand hover:bg-brand-hover text-white rounded-xl font-semibold text-xs shadow-md"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Provision Admin Account
              </Button>
            </div>
          </form>
        </Card>

        {/* Directory Table */}
        <DataTable
          columns={columns}
          data={admins}
          actionItems={[
            { label: "Edit Role & Info", onClick: (row: AdminUser) => openEdit(row) },
            { label: "Reset Password", onClick: (row: AdminUser) => openReset(row) },
            { label: "Revoke Access", onClick: (row: AdminUser) => onDelete(row) },
          ]}
          loading={loadingAdmins}
          totalEntries={admins.length}
        />

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-semibold">
                Edit Admin Account ({editingAdmin?.email})
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={onUpdate} className="space-y-4 pt-3 text-xs">
              <div className="space-y-1">
                <Label className="font-semibold">Full Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Email Address</Label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Privilege Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label.charAt(0).toUpperCase() + r.label.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updating}
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isResetOpen}
          onOpenChange={(open) => {
            setIsResetOpen(open);
            if (!open) setResettingAdmin(null);
          }}
        >
          <DialogContent className="max-w-lg rounded-2xl border border-border shadow-2xl bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-brand" />
                Reset Admin Password
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send a recovery code to the selected admin, then submit the OTP and new password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onResetPassword} className="space-y-4 pt-3 text-xs">
              <div className="space-y-1">
                <Label className="font-semibold">Admin Email</Label>
                <Input
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                  placeholder="admin@onemai.ng"
                />
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Step 1: Send recovery code</p>
                  <p className="text-[11px] text-muted-foreground">
                    This triggers the admin recovery email for {resettingAdmin?.name || resettingAdmin?.email || "the selected admin"}.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSendResetCode}
                  disabled={sendingResetCode}
                  className="rounded-xl text-xs shrink-0"
                >
                  {sendingResetCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                  Send Code
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">OTP Code</Label>
                <InputOTP
                  maxLength={4}
                  value={resetOtp}
                  onChange={(value) => setResetOtp(value.toUpperCase())}
                  pattern="^[A-Za-z0-9]+$"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-10 w-12 rounded-l-xl" />
                    <InputOTPSlot index={1} className="h-10 w-12" />
                    <InputOTPSlot index={2} className="h-10 w-12" />
                    <InputOTPSlot index={3} className="h-10 w-12 rounded-r-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">New Password</Label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="h-9 rounded-xl text-xs pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showResetConfirmPassword ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="h-9 rounded-xl text-xs pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsResetOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReset}
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                >
                  {submittingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
