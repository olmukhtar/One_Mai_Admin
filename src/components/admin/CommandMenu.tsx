import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Users,
  Users2,
  CreditCard,
  Wallet,
  ClipboardCheck,
  UserCheck,
  Folder,
  BookOpen,
  Book,
  UserPlus,
  HeadphonesIcon,
  TrendingUp,
  Activity,
  Target,
  Settings,
  User,
  X,
  Bell,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface NavOption {
  title: string;
  url: string;
  category: string;
  icon: any;
}

const options: NavOption[] = [
  { title: "Dashboard", url: "/dashboard", category: "Navigation", icon: LayoutDashboard },
  { title: "Notifications Center", url: "/notifications", category: "Navigation", icon: Bell },
  { title: "Users", url: "/users", category: "Navigation", icon: Users },
  { title: "Groups", url: "/groups", category: "Navigation", icon: Users2 },
  { title: "Transactions", url: "/transactions", category: "Navigation", icon: CreditCard },
  { title: "Monify Payouts", url: "/monify", category: "Navigation", icon: Wallet },
  { title: "Partner Applications", url: "/affiliate-applications", category: "Partners", icon: ClipboardCheck },
  { title: "Group Contributions", url: "/reports/group-contributions", category: "Reports", icon: TrendingUp },
  { title: "Withdrawals Report", url: "/reports/withdrawals", category: "Reports", icon: Wallet },
  { title: "Members Activity", url: "/reports/members-activity", category: "Reports", icon: Activity },
  { title: "Circle Progress", url: "/reports/circle-progress", category: "Reports", icon: Target },
  { title: "Resources", url: "/resources", category: "Content", icon: Folder },
  { title: "Blog Management", url: "/blog", category: "Content", icon: BookOpen },
  { title: "Knowledge Base", url: "/knowledge-base", category: "Content", icon: Book },
  { title: "Support Center", url: "/support", category: "Support", icon: HeadphonesIcon },
  { title: "Create Admin", url: "/create-admin", category: "System", icon: UserPlus },
  { title: "Profile", url: "/profile", category: "Account", icon: User },
  { title: "Settings", url: "/settings", category: "Account", icon: Settings },
];

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const filtered = options.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (url: string) => {
    navigate(url);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-xl p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded hover:bg-muted text-muted-foreground mr-2 flex-shrink-0"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border flex-shrink-0">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.url}
                    onClick={() => handleSelect(item.url)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-brand/10 hover:text-brand transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-muted group-hover:bg-brand group-hover:text-white transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate admin portal quickly</span>
          <div className="flex items-center gap-2">
            <span>Open:</span>
            <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono text-[10px]">
              ⌘K
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
