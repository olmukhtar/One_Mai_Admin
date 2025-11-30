import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Settings() {
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    // TODO: persist settings
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="Settings" breadcrumbs={[{ label: "Settings" }]} showSearch={false} showExportButtons={false} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* General */}
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={onSave}>
                <div className="space-y-2">
                  <Label htmlFor="org">Organization name</Label>
                  <Input id="org" placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tz">Timezone</Label>
                  <Input id="tz" placeholder="Africa/Lagos" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default currency</Label>
                  <Input id="currency" placeholder="NGN" />
                </div>
                <Button type="submit" className="w-fit bg-[#207EC4] hover:bg-[#1c6fb0]">Save</Button>
              </form>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={onSave}>
                <div className="flex items-center gap-2">
                  <Checkbox id="twofa" />
                  <Label htmlFor="twofa">Require two-factor authentication for admins</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="sessionTimeout" />
                  <Label htmlFor="sessionTimeout">Auto sign-out after 30 minutes idle</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sec-new">Set new admin password</Label>
                    <Input id="sec-new" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sec-confirm">Confirm new password</Label>
                    <Input id="sec-confirm" type="password" />
                  </div>
                </div>
                <Button type="submit" className="w-fit bg-[#207EC4] hover:bg-[#1c6fb0]">Update security</Button>
              </form>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border border-slate-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={onSave}>
                <div className="flex items-center gap-2">
                  <Checkbox id="email-payouts" defaultChecked />
                  <Label htmlFor="email-payouts">Email me about payouts</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="email-users" defaultChecked />
                  <Label htmlFor="email-users">Email me about new users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="email-reports" />
                  <Label htmlFor="email-reports">Send weekly reports</Label>
                </div>
                <Button type="submit" className="w-fit bg-[#207EC4] hover:bg-[#1c6fb0]">Save preferences</Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border border-slate-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Signing out of other sessions will revoke tokens issued to your account on other devices.
              </p>
              <Button variant="destructive" className="w-fit">Sign out of other sessions</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
