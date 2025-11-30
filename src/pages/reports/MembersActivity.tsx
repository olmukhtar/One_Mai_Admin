import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MembersActivity = () => {
  const activities = Array.from({ length: 10 }, (_, i) => ({
    user: "Samuel Thanos",
    dateJoined: "6/7/2025 6:30PM",
    status: "Active",
    id: i + 1,
  }));

  const columns = [
    { key: "user", label: "User" },
    { key: "dateJoined", label: "Date Joined" },
    { 
      key: "status", 
      label: "Status",
      render: (value: string) => <StatusBadge status={value} />
    },
  ];

  const actionItems = [
    { label: "View Profile", onClick: (row: any) => console.log("View", row) },
    { label: "View Activity Log", onClick: (row: any) => console.log("Activity", row) },
    { label: "Send Message", onClick: (row: any) => console.log("Message", row) },
    { label: "Suspend User", onClick: (row: any) => console.log("Suspend", row) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Members Activity"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Members Activity" }
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
          data={activities}
          actionItems={actionItems}
          totalEntries={activities.length}
        />
      </div>
    </AdminLayout>
  );
};

export default MembersActivity;