import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export default function GroupContributions() {
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("2025");

  const contributions = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    user: ["Samuel Thanos", "Adetosin Alabi", "Chidi Okafor", "Fatima Abubakar"][i % 4],
    email: ["samuel@onemai.ng", "tosin@gmail.com", "chidi@yahoo.com", "fatima@domain.org"][i % 4],
    amountContributed: `₦ ${(250000 + i * 45000).toLocaleString()}`,
    lastPaymentDate: "Jun 07, 2025 · 06:30 PM",
    status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "pending" : "active",
  }));

  const columns = [
    {
      key: "user",
      label: "Contributor",
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{row.user}</span>
          <span className="text-[11px] text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: "amountContributed",
      label: "Amount Contributed",
      render: (v: string) => <span className="font-bold text-xs text-brand">{v}</span>,
    },
    {
      key: "lastPaymentDate",
      label: "Last Payment Date",
      render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Group Contributions Ledger"
          subtitle="Audit aggregate member deposits across ROSCA savings groups."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Group Contributions" },
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
          data={contributions}
          actionItems={[
            { label: "Inspect Contributor", onClick: (row: any) => console.log("View", row) },
            { label: "Export Receipt", onClick: (row: any) => console.log("Download", row) },
          ]}
          totalEntries={contributions.length}
        />
      </div>
    </AdminLayout>
  );
}