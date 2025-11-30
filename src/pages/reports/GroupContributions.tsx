import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GroupContributions = () => {
  const contributions = Array.from({ length: 10 }, (_, i) => ({
    user: "Samuel Thanos",
    amountContributed: "Adetosin@gmail.com",
    lastPaymentDate: "6/7/2025 6:30PM",
    status: "Active",
    id: i + 1,
  }));

  const columns = [
    { key: "user", label: "User" },
    { key: "amountContributed", label: "Amount Contributed" },
    { key: "lastPaymentDate", label: "Last Payment Date" },
    { 
      key: "status", 
      label: "Status",
      render: (value: string) => <StatusBadge status={value} />
    },
  ];

  const actionItems = [
    { label: "View Details", onClick: (row: any) => console.log("View", row) },
    { label: "Download Report", onClick: (row: any) => console.log("Download", row) },
    { label: "Send Reminder", onClick: (row: any) => console.log("Remind", row) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Group Contributions"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Group Contributions" }
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="w-32 h-9 border rounded-md px-3 flex items-center text-sm text-muted-foreground bg-background">
              Search ID
            </div>
          </div>
        </div>
        
        <DataTable 
          columns={columns}
          data={contributions}
          actionItems={actionItems}
          totalEntries={contributions.length}
        />
      </div>
    </AdminLayout>
  );
};

export default GroupContributions;