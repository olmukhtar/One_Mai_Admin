import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function CircleProgress() {
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("2025");

  const circles = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    circle: ["Mom's Birthday", "Lagos Tech ROSCA", "Family Savings Circle", "Holiday Vault"][i % 4],
    totalContributed: `₦ ${(312314 + i * 85000).toLocaleString()}`,
    members: `${5 + (i % 6)} Members`,
    dateCreated: "Jun 07, 2025 · 06:30 PM",
  }));

  const columns = [
    {
      key: "circle",
      label: "Savings Circle",
      render: (v: string) => <span className="font-bold text-xs text-foreground">{v}</span>,
    },
    {
      key: "totalContributed",
      label: "Aggregate Contributed",
      render: (v: string) => <span className="font-bold text-xs text-brand">{v}</span>,
    },
    {
      key: "members",
      label: "Roster Count",
      render: (v: string) => <span className="text-xs font-medium text-foreground">{v}</span>,
    },
    {
      key: "dateCreated",
      label: "Created Date",
      render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span>,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Circle Rotation Progress"
          subtitle="Track lifecycle completion rates, payout rounds, and member contributions."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Circle Progress" },
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
          data={circles}
          actionItems={[
            { label: "Inspect Circle Details", onClick: (row: any) => console.log("View", row) },
            { label: "Export Roster Report", onClick: (row: any) => console.log("Report", row) },
          ]}
          totalEntries={circles.length}
        />
      </div>
    </AdminLayout>
  );
}