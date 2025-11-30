import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Calendar, Plus } from "lucide-react";

const CircleManagement = () => {
  const circles = [
    {
      name: "Mom's Birthday",
      members: 8,
      totalContributed: "₦ 300,000",
      status: "Active",
      targetAmount: "₦ 500,000",
      progress: 60,
      endDate: "2025-12-31",
    },
    {
      name: "Friends Vacation Fund",
      members: 12,
      totalContributed: "₦ 150,000",
      status: "Active", 
      targetAmount: "₦ 400,000",
      progress: 37.5,
      endDate: "2025-06-30",
    },
    {
      name: "Emergency Fund Circle",
      members: 15,
      totalContributed: "₦ 75,000",
      status: "Active",
      targetAmount: "₦ 200,000", 
      progress: 37.5,
      endDate: "2025-03-31",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Circle Management"
            breadcrumbs={[
              { label: "Dashboard", href: "/" },
              { label: "Circle Management" }
            ]}
            showSearch={false}
            showExportButtons={false}
          />
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Circle
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {circles.map((circle, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{circle.name}</CardTitle>
                  <span className="px-2 py-1 text-xs rounded-full bg-success/10 text-success">
                    {circle.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{circle.members}</p>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{circle.totalContributed}</p>
                      <p className="text-xs text-muted-foreground">Contributed</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress to Goal</span>
                    <span>{circle.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${circle.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: {circle.targetAmount}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Ends: {circle.endDate}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">35</div>
              <p className="text-xs text-muted-foreground">Total Circles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">284</div>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">₦2.1M</div>
              <p className="text-xs text-muted-foreground">Total Contributions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">89%</div>
              <p className="text-xs text-muted-foreground">Average Success Rate</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CircleManagement;