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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, ShieldAlert, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";

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

const BASE = "https://test.joinonemai.com/api";
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

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Create Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState(""); // usually email is immutable, but let's see
  const [editRole, setEditRole] = useState("");
  const [updating, setUpdating] = useState(false);

  // Checks
  const hasAccess = currentUserRole === "admin";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/create-admin" } });
    }
  }, [token, navigate]);

  // Fetch roles and admins
  useEffect(() => {
    if (!token || !hasAccess) {
      setLoadingRoles(false);
      setLoadingAdmins(false);
      return;
    }

    async function fetchData() {
      try {
        // Fetch Roles
        const roleRes = await apiFetch(ROLES_ENDPOINT);
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          if (roleData.roles && Array.isArray(roleData.roles)) {
            setRoles(roleData.roles);
          }
        }

        // Fetch Admins
        const adminRes = await apiFetch(FETCH_ADMINS_ENDPOINT);
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          // Adjust based on actual response structure: could be data.admins or data directly
          const list = adminData.admins || adminData || [];
          if (Array.isArray(list)) {
            setAdmins(list);
          }
        }
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to load initial data");
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
        const list = adminData.admins || adminData || [];
        if (Array.isArray(list)) {
          setAdmins(list);
        }
      }
    } catch {
      // silent fail
    }
  }

  // --- CREATE ---
  function validateCreate() {
    if (!name.trim()) return "Name is required";
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email";
    if (!password || password.length < 8) return "Password must be at least 8 characters";
    if (!selectedRole) return "Role is required";
    return null;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAccess) return;

    const v = validateCreate();
    if (v) {
      setErr(v);
      toast.error(v);
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
          role: selectedRole
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to create admin");
      }

      toast.success("Admin created successfully");
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setSelectedRole("");
      refreshAdmins();
    } catch (e: any) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // --- DELETE ---
  async function onDelete(admin: AdminUser) {
    if (!confirm(`Are you sure you want to delete admin "${admin.name || admin.email}"?`)) return;

    try {
      const res = await apiFetch(DELETE_ENDPOINT(admin._id), {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete admin");
      }

      toast.success("Admin deleted successfully");
      refreshAdmins();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // --- UPDATE ---
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
          role: editRole
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to update admin");
      }

      toast.success("Admin updated successfully");
      setIsEditOpen(false);
      setEditingAdmin(null);
      refreshAdmins();

    } catch (e: any) {
      toast.error(e.message);
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
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin Management" }]}
            searchPlaceholder=""
            showSearch={false}
          />
          <Card className="max-w-2xl border border-slate-100 shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-red-100 p-3 mb-4">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md">
                  You don't have permission to manage admin accounts.
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
      <div className="space-y-8">
        <PageHeader
          title="Admin Management"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admins" }]}
          searchPlaceholder=""
          showSearch={false}
        />

        {/* Create Admin Form */}
        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create New Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {err && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {err}
              </div>
            )}
            <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole} disabled={loadingRoles}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder={loadingRoles ? "Loading..." : "Select Role"} />
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

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Admin
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Admins List */}
        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-base font-semibold">Existing Admins</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAdmins ? (
              <div className="p-8 text-center text-slate-500">Loading admins...</div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No admins found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {admin.name || admin.firstName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                          {admin.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {admin.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEdit(admin)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDelete(admin)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false);
            setEditingAdmin(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
              <DialogDescription>Update details for {editingAdmin?.email}</DialogDescription>
            </DialogHeader>
            <form onSubmit={onUpdate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select Role" />
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}