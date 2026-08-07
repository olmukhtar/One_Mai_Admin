import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function MembersActivity() {
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("2025");

  const activities = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    user: ["Samuel Thanos", "Halima Suleiman", "David Nwosu", "Grace Danjuma"][i % 4],
    email: ["samuel@onemai.ng", "halima@gmail.com", "david@nwosu.ng", "grace@corp.org"][i % 4],
    dateJoined: "Jun 07, 2025 · 06:30 PM",
    lastLogin: "2 hours ago",
    status: i % 2 === 0 ? "active" : "completed",
  }));

  const columns = [
    {
      key: "user",
      label: "Platform Member",
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{row.user}</span>
          <span className="text-[11px] text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: "dateJoined",
      label: "Date Joined",
      render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span>,
    },
    {
      key: "lastLogin",
      label: "Last Activity",
      render: (v: string) => <span className="text-xs font-semibold text-foreground">{v}</span>,
    },
    {
      key: "status",
      label: "Account Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Members Activity Log"
          subtitle="Track user registrations, session timestamps, and activity history."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Members Activity" },
          ]}
          showExportButtons
          rightSlot={
            <div className="flex items-center gap-2">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9 w-32 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="jan">January</SelectItem>
                  <SelectItem value="feb">February</SelectItem>
                  <SelectItem value="mar">March</SelectItem>
                  <SelectItem value="jun">June</SelectItem>
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 w-28 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        <DataTable
          columns={columns}
          data={activities}
          actionItems={[
            { label: "View User Profile", onClick: (row: any) => console.log("Profile", row) },
            { label: "View Audit Log", onClick: (row: any) => console.log("Audit", row) },
          ]}
          totalEntries={activities.length}
        />
      </div>
    </AdminLayout>
  );
}