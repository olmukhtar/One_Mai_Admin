import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function WithdrawalsReport() {
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("2025");

  const withdrawals = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    user: ["Samuel Thanos", "Bisi Adebayo", "Emeka Vance", "Zainab Bello"][i % 4],
    email: ["samuel@onemai.ng", "bisi@gmail.com", "emeka@fintech.co", "zainab@mail.com"][i % 4],
    amount: `₦ ${(180000 + i * 65000).toLocaleString()}`,
    circle: ["Mom's Birthday", "Tech Founders ROSCA", "Lagos Entrepreneurs", "Vacation Fund"][i % 4],
    date: "Jun 07, 2025 · 06:30 PM",
    status: i % 4 === 0 ? "completed" : i % 4 === 1 ? "pending" : i % 4 === 2 ? "active" : "failed",
  }));

  const columns = [
    {
      key: "user",
      label: "Beneficiary",
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{row.user}</span>
          <span className="text-[11px] text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Payout Amount",
      render: (v: string) => <span className="font-bold text-xs text-brand">{v}</span>,
    },
    {
      key: "circle",
      label: "Origin Circle",
      render: (v: string) => <span className="font-medium text-xs text-foreground">{v}</span>,
    },
    {
      key: "date",
      label: "Payout Date",
      render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span>,
    },
    {
      key: "status",
      label: "Transfer Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Withdrawals & Payout Audit"
          subtitle="Monitor bank payouts, circle rotation disbursemens, and liquidation receipts."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Withdrawals" },
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
          data={withdrawals}
          actionItems={[
            { label: "Inspect Receipt", onClick: (row: any) => console.log("View", row) },
            { label: "Download Voucher", onClick: (row: any) => console.log("Download", row) },
          ]}
          totalEntries={withdrawals.length}
        />
      </div>
    </AdminLayout>
  );
}