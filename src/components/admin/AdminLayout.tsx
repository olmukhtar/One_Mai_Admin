import React, { useMemo, useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { CommandMenu } from "./CommandMenu";
import {
  Bell,
  ChevronDown,
  Search,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AUTH_STORAGE_KEY = "admin_auth";

function initials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "AD";
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dark Mode Theme toggle state
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("admin_theme") === "dark" ||
      document.documentElement.classList.contains("dark")
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("admin_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin_theme", "light");
    }
  }, [isDark]);

  const session = useMemo(() => {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) ||
      sessionStorage.getItem(AUTH_STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const displayName: string =
    session?.user?.name || session?.user?.email || "Admin";
  const displayRole: string = session?.role || session?.user?.role || "Admin";
  const avatarFallback = initials(displayName);

  function handleLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    navigate("/", { replace: true });
  }

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New Partner Application",
      time: "10 mins ago",
      read: false,
      link: "/affiliate-applications",
    },
    {
      id: 2,
      title: "Monify Batch Payout Completed",
      time: "1 hour ago",
      read: false,
      link: "/monify",
    },
    {
      id: 3,
      title: "New Circle Created: Lagos Savers",
      time: "3 hours ago",
      read: true,
      link: "/groups",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({
      title: "Notifications Read",
      description: "Marked all items as read.",
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar (Handles desktop fixed & mobile slide-over drawer) */}
      <AppSidebar
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Modern Header */}
        <header className="h-16 border-b border-border/60 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-20">
          {/* Mobile Hamburger & Logo Branding */}
          <div className="flex items-center gap-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="h-9 w-9 rounded-xl hover:bg-muted text-foreground"
              aria-label="Toggle Mobile Navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand text-white font-black flex items-center justify-center text-sm shadow-sm">
                O
              </div>
              <span className="font-extrabold text-foreground text-sm tracking-tight">
                ONEMAI
              </span>
            </div>
          </div>

          {/* Desktop Search Launcher (Cmd+K) */}
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-muted-foreground transition-all duration-200 text-xs font-medium w-64"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">Search or type command...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono shadow-xs">
              ⌘K
            </kbd>
          </button>

          {/* Right Action Icons & User Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Icon Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandOpen(true)}
              className="md:hidden h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </Button>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-xl border-border">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-sm">Notifications</span>
                  <span className="text-[10px] bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                </div>
                <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => navigate(n.link)}
                      className={`p-3 text-xs transition-colors hover:bg-muted/50 cursor-pointer ${
                        !n.read ? "bg-brand/5 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <p className="text-foreground font-medium flex items-center justify-between">
                        {n.title}
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-border flex items-center justify-between gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 text-[11px]"
                  >
                    Mark all read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/notifications")}
                    className="text-xs text-brand font-semibold hover:text-brand hover:bg-brand/10 h-7 text-[11px]"
                  >
                    View All <ArrowUpRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-[1px] bg-border mx-1" />

            {/* Admin Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-1.5 sm:px-2 rounded-xl hover:bg-muted"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-brand/20">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback className="bg-brand text-white font-bold text-xs">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start text-left">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize font-medium">
                      {displayRole}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1 shadow-xl border-border">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-xs font-bold text-foreground">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3 w-3 text-brand" /> {displayRole}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg text-xs cursor-pointer">
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg text-xs cursor-pointer">
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                  className="rounded-lg text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Scrollable Main View Window */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-background">
          {children}
        </main>
      </div>

      {/* Global Command Menu */}
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}