import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Bell,
  CheckCircle2,
  Trash2,
  Check,
  ExternalLink,
  ClipboardCheck,
  Wallet,
  Users2,
  ShieldAlert,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SystemNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  category: "affiliate" | "payout" | "circle" | "system";
  read: boolean;
  priority: "high" | "medium" | "low";
  link?: string;
  createdAt: string;
};

const initialNotifications: SystemNotification[] = [
  {
    id: "notif-1",
    title: "New Partner Application",
    message: "Candidate Chibuzor Aghandu submitted an application with 45,000 estimated audience reach.",
    time: "10 mins ago",
    category: "affiliate",
    read: false,
    priority: "high",
    link: "/affiliate-applications",
    createdAt: "2026-08-07T19:20:00Z",
  },
  {
    id: "notif-2",
    title: "Monify Batch Payout Completed",
    message: "Automated disbursement batch #MNF-9023 finished processing 14 member payouts.",
    time: "1 hour ago",
    category: "payout",
    read: false,
    priority: "medium",
    link: "/monify",
    createdAt: "2026-08-07T18:30:00Z",
  },
  {
    id: "notif-3",
    title: "New Circle Created: Lagos Savers",
    message: "ROSCA Savings Circle 'Lagos Savers' initialized with 12 member positions.",
    time: "3 hours ago",
    category: "circle",
    read: true,
    priority: "low",
    link: "/groups",
    createdAt: "2026-08-07T16:00:00Z",
  },
  {
    id: "notif-4",
    title: "System Backup & Compliance Sync Complete",
    message: "Nightly encrypted data vault backup successfully synchronized across nodes.",
    time: "5 hours ago",
    category: "system",
    read: true,
    priority: "low",
    link: "/settings",
    createdAt: "2026-08-07T14:00:00Z",
  },
  {
    id: "notif-5",
    title: "Pending Withdrawal Review Required",
    message: "High-value liquidation request queued for account verification.",
    time: "8 hours ago",
    category: "payout",
    read: true,
    priority: "high",
    link: "/reports/withdrawals",
    createdAt: "2026-08-07T11:00:00Z",
  },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<SystemNotification[]>(initialNotifications);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({
      title: "All Notifications Marked Read",
      description: "Your notification queue is up to date.",
    });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast({
      title: "Notification Removed",
      description: "Item dismissed from notification list.",
    });
  };

  const filtered = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "unread") return matchesSearch && !n.read;
    if (activeTab === "affiliate") return matchesSearch && n.category === "affiliate";
    if (activeTab === "payout") return matchesSearch && n.category === "payout";
    if (activeTab === "circle") return matchesSearch && n.category === "circle";
    return matchesSearch;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (category: SystemNotification["category"]) => {
    switch (category) {
      case "affiliate":
        return <ClipboardCheck className="h-4 w-4 text-brand" />;
      case "payout":
        return <Wallet className="h-4 w-4 text-emerald-600" />;
      case "circle":
        return <Users2 className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notification Center"
          subtitle="System security alerts, financial payout updates, and application requests."
          breadcrumbs={[{ label: "Notifications" }]}
          rightSlot={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold"
                >
                  <Check className="h-4 w-4 text-brand" /> Mark All as Read
                </Button>
              )}
            </div>
          }
        />

        {/* Tab Controls & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid w-full sm:w-auto grid-cols-5 rounded-xl bg-muted p-1">
              <TabsTrigger value="all" className="rounded-lg text-xs font-semibold">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-lg text-xs font-semibold">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="affiliate" className="rounded-lg text-xs font-semibold">
                Partners
              </TabsTrigger>
              <TabsTrigger value="payout" className="rounded-lg text-xs font-semibold">
                Payouts
              </TabsTrigger>
              <TabsTrigger value="circle" className="rounded-lg text-xs font-semibold">
                Circles
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/80 bg-card text-xs focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Notification List */}
        {filtered.length === 0 ? (
          <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-12 text-center space-y-3">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-base font-semibold text-foreground">No notifications found</h3>
            <p className="text-xs text-muted-foreground">
              You are all caught up! There are no notifications matching your filter.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <Card
                key={item.id}
                className={`border shadow-sm rounded-2xl transition-all duration-200 overflow-hidden ${
                  !item.read
                    ? "bg-brand/5 dark:bg-brand/10 border-brand/30"
                    : "bg-card border-border/80"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-card border border-border/60 flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                          {!item.read && (
                            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                          )}
                          <StatusBadge status={item.priority} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.message}
                        </p>
                        <span className="text-[11px] text-muted-foreground/80 font-medium block pt-1">
                          {item.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            markAsRead(item.id);
                            navigate(item.link!);
                          }}
                          className="h-8 rounded-lg text-xs font-semibold text-brand hover:bg-brand/10"
                        >
                          View Details <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                      {!item.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead(item.id)}
                          className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
                          title="Mark as Read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => clearNotification(item.id)}
                        className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-600"
                        title="Dismiss"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
