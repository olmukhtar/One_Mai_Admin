import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, ShieldAlert, Pencil, Trash2, Plus, Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

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

interface Role {
  label: string;
  value: string;
}

function useToken() {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
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
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
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
  const currentUserRole = useUserRole();
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

  const hasAccess = currentUserRole === "admin";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/create-admin" } });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token || !hasAccess) {
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
  }, [token, hasAccess]);

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
    if (!hasAccess) return;

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

  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Admin Management"
            breadcrumbs={[{ label: "Admin Management" }]}
          />
          <Card className="max-w-xl border border-border shadow-sm rounded-2xl p-6 bg-card">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <ShieldAlert className="h-8 w-8 text-rose-600" />
              <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
              <p className="text-xs text-muted-foreground">
                Provisioning administrative roles is restricted exclusively to System Super Admins.
              </p>
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="rounded-xl text-xs">
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </AdminLayout>
    );
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
      </div>
    </AdminLayout>
  );
}