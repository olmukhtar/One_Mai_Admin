import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Withdrawals = () => {
  const withdrawals = Array.from({ length: 10 }, (_, i) => ({
    user: "Samuel Thanos",
    amount: "Adetosin@gmail.com",
    circle: "Mom's Birthday",
    date: "6/7/2025 6:30PM",
    status: "Completed",
    id: i + 1,
  }));

  const columns = [
    { key: "user", label: "User" },
    { key: "amount", label: "Amount" },
    { key: "circle", label: "Circle" },
    { key: "date", label: "Date" },
    { 
      key: "status", 
      label: "Status",
      render: (value: string) => <StatusBadge status={value} />
    },
  ];

  const actionItems = [
    { label: "View Details", onClick: (row: any) => console.log("View", row) },
    { label: "Process Withdrawal", onClick: (row: any) => console.log("Process", row) },
    { label: "Reject", onClick: (row: any) => console.log("Reject", row) },
    { label: "Download Receipt", onClick: (row: any) => console.log("Download", row) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Withdrawals"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Withdrawals" }
          ]}
          showSearch={false}
        />

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Month</span>
            <Select defaultValue="">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jan">January</SelectItem>
                <SelectItem value="feb">February</SelectItem>
                <SelectItem value="mar">March</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year</span>
            <Select defaultValue="">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DataTable 
          columns={columns}
          data={withdrawals}
          actionItems={actionItems}
          totalEntries={withdrawals.length}
        />
      </div>
    </AdminLayout>
  );
};

export default Withdrawals;