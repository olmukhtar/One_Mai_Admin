import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Mail, Phone, ShieldCheck, UserCheck, Save, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { AUTH_STORAGE_KEY } from "@/lib/api";

type SessionUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

function parseSession(): { token?: string; user?: SessionUser; role?: string } | null {
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

function initials(name: string) {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Profile() {
  const { toast } = useToast();
  const session = useMemo(() => parseSession(), []);
  const user = session?.user || {};
  const { first, last } = splitName(user.name);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState("+234 800 000 0000");
  const [bio, setBio] = useState("Administrative operations manager.");

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    toast({
      title: "Avatar Preview Updated",
      description: "Click Save Changes to apply profile update.",
    });
  }

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    toast({
      title: "Profile Updated",
      description: "Personal details saved successfully.",
    });
  }

  function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    toast({
      title: "Password Updated",
      description: "Your account credentials have been refreshed.",
    });
  }

  const displayName =
    (user.name && user.name.trim()) ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Admin Officer";

  const role = session?.role || user.role || "Admin";
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Account Profile"
          subtitle="Manage your admin identity, contact email, and security password."
          breadcrumbs={[{ label: "Profile" }]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Account Summary Card */}
          <Card className="lg:col-span-1 border border-border/80 shadow-sm rounded-2xl bg-card">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-brand/10 shadow-md">
                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                    <AvatarFallback className="bg-brand text-white font-bold text-xl">
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-brand-hover transition-colors"
                    title="Update Profile Picture"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onAvatarChange}
                    />
                  </label>
                </div>

                <div className="mt-4 space-y-1">
                  <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" /> {displayRole}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/60 text-xs">
                <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                  <Mail className="h-4 w-4 text-brand" />
                  <span className="truncate text-foreground font-semibold">
                    {email || user.email || "admin@onemai.com"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                  <Phone className="h-4 w-4 text-brand" />
                  <span className="text-foreground font-semibold">{phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Profile Edit & Password Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form className="grid gap-4 sm:grid-cols-2 text-xs" onSubmit={onSaveProfile}>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">First Name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">Last Name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="font-semibold text-foreground">Email Address</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="font-semibold text-foreground">Phone Number</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="font-semibold text-foreground">Role Bio / Notes</Label>
                    <Textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <Button type="submit" className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold gap-1.5">
                      <Save className="h-4 w-4" /> Save Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Security Password
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form className="grid gap-4 sm:grid-cols-2 text-xs" onSubmit={onChangePassword}>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="font-semibold text-foreground">Current Password</Label>
                    <Input type="password" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">New Password</Label>
                    <Input type="password" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">Confirm New Password</Label>
                    <Input type="password" className="h-10 rounded-xl" />
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <Button type="submit" className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold gap-1.5">
                      <KeyRound className="h-4 w-4" /> Update Password
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
