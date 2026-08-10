import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, ShieldCheck, Bell, AlertTriangle, Save, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("Onemai Financial Platform");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [currency, setCurrency] = useState("NGN");

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    toast({
      title: "Settings Saved",
      description: "System preferences updated successfully.",
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="System Preferences & Settings"
          subtitle="Configure system-wide parameters, security thresholds, and email alerts."
          breadcrumbs={[{ label: "Settings" }]}
        />

        <Tabs defaultValue="general" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted p-1 max-w-2xl">
            <TabsTrigger value="general" className="rounded-lg text-xs font-semibold">
              <Building className="h-3.5 w-3.5 mr-1.5" /> General
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg text-xs font-semibold">
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="danger" className="rounded-lg text-xs font-semibold text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Danger Zone
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card max-w-2xl">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form className="space-y-4 text-xs" onSubmit={onSave}>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">Organization Name</Label>
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">Timezone</Label>
                    <Input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-foreground">Base Currency</Label>
                    <Input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold gap-1.5">
                    <Save className="h-4 w-4" /> Save Preferences
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card max-w-2xl">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  Security Policies & Auth Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form className="space-y-4 text-xs" onSubmit={onSave}>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <Checkbox id="twofa" defaultChecked />
                    <Label htmlFor="twofa" className="font-medium cursor-pointer">
                      Enforce Multi-Factor Authentication (MFA) for all admin roles
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <Checkbox id="sessionTimeout" defaultChecked />
                    <Label htmlFor="sessionTimeout" className="font-medium cursor-pointer">
                      Auto logout active session after 30 minutes of inactivity
                    </Label>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <span className="font-bold text-foreground block">Update Access Password</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="font-semibold text-muted-foreground">New Password</Label>
                        <Input type="password" className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-semibold text-muted-foreground">Confirm Password</Label>
                        <Input type="password" className="h-10 rounded-xl" />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold gap-1.5">
                    <KeyRound className="h-4 w-4" /> Update Security Policy
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card max-w-2xl">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base font-semibold text-foreground">
                  System Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form className="space-y-3 text-xs" onSubmit={onSave}>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <Checkbox id="email-payouts" defaultChecked />
                    <Label htmlFor="email-payouts" className="font-medium cursor-pointer">
                      Receive immediate email alerts for pending Monify payout requests
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <Checkbox id="email-users" defaultChecked />
                    <Label htmlFor="email-users" className="font-medium cursor-pointer">
                      Email notifications for new partner submissions
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <Checkbox id="email-reports" defaultChecked />
                    <Label htmlFor="email-reports" className="font-medium cursor-pointer">
                      Deliver weekly system analytics summary to inbox
                    </Label>
                  </div>
                  <Button type="submit" className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold gap-1.5 mt-2">
                    <Save className="h-4 w-4" /> Save Notification Rules
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger">
            <Card className="border border-rose-200/80 shadow-sm rounded-2xl bg-card max-w-2xl">
              <CardHeader className="border-b border-rose-100 pb-3">
                <CardTitle className="text-base font-semibold text-rose-600">
                  Critical Security Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Revoking active tokens will sign out all active administrative sessions across web and mobile endpoints.
                </p>
                <Button variant="destructive" className="rounded-xl text-xs font-semibold">
                  Sign Out All Active Sessions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
