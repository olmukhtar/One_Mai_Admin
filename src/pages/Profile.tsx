// src/pages/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Mail, Phone, Shield } from "lucide-react";

const AUTH_STORAGE_KEY = "admin_auth";

type SessionUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

function parseSession(): { token?: string; user?: SessionUser } | null {
  const raw =
    localStorage.getItem(AUTH_STORAGE_KEY) ||
    sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function splitName(full?: string) {
  const s = (full || "").trim();
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.slice(-1).join(" ") };
}

export default function Profile() {
  const session = useMemo(() => parseSession(), []);
  const user = session?.user || {};
  const { first, last } = splitName(user.name);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    // if storage changes externally in future, keep in sync
    const latest = parseSession();
    const u = latest?.user || {};
    const names = splitName(u.name);
    setFirstName((v) => v || names.first);
    setLastName((v) => v || names.last);
    setEmail((v) => v || u.email || "");
  }, []);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  }

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    // No profile endpoint provided. Wire up here when available.
    // Example request:
    // fetch(`${BASE}/admin/profile`, { method: "PUT", headers: { Authorization: `Bearer ${session?.token}` }, body: JSON.stringify({...}) })
    console.log("Save profile (client-only):", {
      firstName,
      lastName,
      email,
      phone,
      bio,
    });
  }

  function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    // No password endpoint provided. Wire up here when available.
    console.log("Change password (not implemented)");
  }

  const displayName =
    (user.name && user.name.trim()) ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Admin User";
  const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Admin";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumbs={[{ label: "Profile" }]} showSearch={false} showExportButtons={false} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: summary */}
          <Card className="lg:col-span-1 border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <img
                    src={
                      avatarUrl ??
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        displayName || user.email || "Admin"
                      )}&backgroundType=gradientLinear&fontFamily=Inter`
                    }
                    alt="Avatar"
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-white shadow"
                  />
                  <label
                    htmlFor="avatar"
                    className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-[#207EC4] text-white cursor-pointer shadow"
                    title="Change avatar"
                  >
                    <Camera className="h-4 w-4" />
                    <input id="avatar" type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                  </label>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="text-slate-900 font-medium">{displayName}</div>
                  <div className="text-slate-500 text-sm">{role}</div>
                </div>

                <div className="mt-4 w-full space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4" />
                    {email || user.email || "admin@company.com"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    {phone || "+234 000 000 0000"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Shield className="h-4 w-4" />
                    Role: {role}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right column: forms */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSaveProfile}>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Joseph"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+234 000 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      rows={4}
                      placeholder="Short description…"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" className="bg-[#207EC4] hover:bg-[#1c6fb0]">
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={onChangePassword}>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="current">Current password</Label>
                    <Input id="current" type="password" autoComplete="current-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPass">New password</Label>
                    <Input id="newPass" type="password" autoComplete="new-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPass">Confirm new password</Label>
                    <Input id="confirmPass" type="password" autoComplete="new-password" />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="default" className="bg-[#207EC4] hover:bg-[#1c6fb0]">
                      Update password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
