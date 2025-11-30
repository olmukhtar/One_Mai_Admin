import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CircleProgress = () => {
  const circles = [
    {
      circle: "Mom's Birthday",
      totalContributed: "₦ 312,314",
      members: "5",
      dateCreated: "6/7/2025 6:30PM",
      id: 1,
    },
    ...Array.from({ length: 9 }, (_, i) => ({
      circle: "Mom's Birthday",
      totalContributed: "₦ 300,000",
      members: "8",
      dateCreated: "6/7/2025 6:30PM", 
      id: i + 2,
    }))
  ];

  const columns = [
    { key: "circle", label: "Circle" },
    { key: "totalContributed", label: "Total Contributed" },
    { key: "members", label: "Members" },
    { key: "dateCreated", label: "Date Created" },
  ];

  const actionItems = [
    { label: "View Circle", onClick: (row: any) => console.log("View", row) },
    { label: "View Members", onClick: (row: any) => console.log("Members", row) },
    { label: "Download Report", onClick: (row: any) => console.log("Download", row) },
    { label: "Circle Settings", onClick: (row: any) => console.log("Settings", row) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Circle Progress"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Circle Progress" }
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
          data={circles}
          actionItems={actionItems}
          totalEntries={circles.length}
        />
      </div>
    </AdminLayout>
  );
};

export default CircleProgress;