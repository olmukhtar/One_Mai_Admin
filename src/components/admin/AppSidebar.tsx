import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Users2,
  CreditCard,
  FileText,
  HeadphonesIcon,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Wallet,
  Activity,
  Target,
  UserPlus,
  Folder,
  BookOpen,
  Book,
  ClipboardCheck,
  LogOut,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_STORAGE_KEY = "admin_auth";

const mainItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "Marketing", "admin"],
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
  {
    title: "Groups",
    url: "/groups",
    icon: Users2,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
  {
    title: "Partner Applications",
    url: "/affiliate-applications",
    icon: ClipboardCheck,
    roles: ["Admin", "Account", "admin"],
  },
  {
    title: "Campaigns",
    url: "/campaigns",
    icon: Target,
    roles: ["Admin", "admin"],
  },

  {
    title: "Transactions",
    url: "/transactions",
    icon: CreditCard,
    roles: ["Admin", "Account", "Customer Support", "admin"],
  },
  {
    title: "Monify Payouts",
    url: "/monify",
    icon: Wallet,
    roles: ["Admin", "Account", "admin"],
  },
  {
    title: "Resources",
    url: "/resources",
    icon: Folder,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "Marketing", "admin"],
  },
  {
    title: "Blog",
    url: "/blog",
    icon: BookOpen,
    roles: ["Admin", "Account", "Marketing", "admin"],
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: Book,
    roles: ["Admin", "Account", "Customer Support", "admin"],
  },
  {
    title: "Create Admin",
    url: "/create-admin",
    icon: UserPlus,
    roles: ["Admin", "admin"],
  },
];

const reportsItems = [
  {
    title: "Group Contributions",
    url: "/reports/group-contributions",
    icon: TrendingUp,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
  {
    title: "Withdrawals",
    url: "/reports/withdrawals",
    icon: Wallet,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
  {
    title: "Members Activity",
    url: "/reports/members-activity",
    icon: Activity,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
  {
    title: "Circle Progress",
    url: "/reports/circle-progress",
    icon: Target,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
];

const supportItems = [
  {
    title: "Support",
    url: "/support",
    icon: HeadphonesIcon,
    roles: ["Admin", "Account", "Front Desk", "Customer Support", "admin"],
  },
];

interface AppSidebarProps {
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ className, isMobileOpen, onMobileClose }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, logout } = useAuth();

  const rawRole = role || "admin";
  const userRole =
    rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

  const displayName =
    user?.name || user?.email?.split("@")[0] || "Admin";

  const reportsActive = location.pathname.startsWith("/reports");
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  const handleLogout = () => {
    logout();
    if (onMobileClose) onMobileClose();
    navigate("/", { replace: true });
  };

  const filteredMainItems = mainItems;
  const filteredReportsItems = reportsItems;
  const filteredSupportItems = supportItems;

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={cn(
          "bg-[#207EC4] text-white transition-all duration-300 ease-in-out h-screen flex flex-col z-50 shadow-xl border-r border-white/10 select-none",
          // Mobile responsive placement
          "fixed md:static top-0 left-0 bottom-0",
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-64",
          className
        )}
      >
        {/* Header / Branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/15 flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
              <span className="text-white font-extrabold text-lg tracking-wider">O</span>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-white text-base tracking-wide leading-tight">
                  OneMAI
                </span>
                <span className="text-[10px] text-white/70 font-semibold tracking-widest uppercase">
                  Admin Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle / Mobile close button */}
          {isMobileOpen ? (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 md:hidden"
              title="Close Menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Section */}
          <div className="space-y-1">
            {(!isCollapsed || isMobileOpen) && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2">
                Main Menu
              </p>
            )}

            {filteredMainItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.url === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.url);

              const content = (
                <NavLink
                  to={item.url}
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group",
                    isActive
                      ? "bg-white text-[#207EC4] shadow-lg font-semibold"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-[#207EC4]" : "text-white/90"
                    )}
                  />
                  {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.title}</span>}
                </NavLink>
              );

              if (isCollapsed && !isMobileOpen) {
                return (
                  <Tooltip key={item.title} delayDuration={100}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-white font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.title}>{content}</div>;
            })}
          </div>

          {/* Reports Section */}
          {filteredReportsItems.length > 0 && (
            <div className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2">
                  Analytics
                </p>
              )}

              <div>
                {isCollapsed && !isMobileOpen ? (
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setReportsOpen(!reportsOpen)}
                        className={cn(
                          "w-full flex items-center justify-center p-2.5 rounded-xl text-white/90 hover:bg-white/10",
                          reportsActive && "bg-white/20 text-white"
                        )}
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-white font-medium">
                      Reports Overview
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => setReportsOpen(!reportsOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 text-white/90 hover:bg-white/10",
                      reportsActive && "bg-white/20 text-white font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-white/90" />
                      <span>Reports</span>
                    </div>
                    {reportsOpen ? (
                      <ChevronDown className="h-4 w-4 text-white/70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    )}
                  </button>
                )}

                {/* Submenu */}
                {reportsOpen && (
                  <div className={cn("mt-1 space-y-1", (!isCollapsed || isMobileOpen) && "ml-4 border-l border-white/20 pl-3")}>
                    {filteredReportsItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = location.pathname === subItem.url;

                      const subContent = (
                        <NavLink
                          to={subItem.url}
                          onClick={handleNavClick}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            isSubActive
                              ? "bg-white text-[#207EC4] font-bold shadow-sm"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <SubIcon className="h-4 w-4 flex-shrink-0" />
                          {(!isCollapsed || isMobileOpen) && <span className="truncate">{subItem.title}</span>}
                        </NavLink>
                      );

                      if (isCollapsed && !isMobileOpen) {
                        return (
                          <Tooltip key={subItem.title} delayDuration={100}>
                            <TooltipTrigger asChild>{subContent}</TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-900 text-white font-medium">
                              {subItem.title}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return <div key={subItem.title}>{subContent}</div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Support Section */}
          {filteredSupportItems.length > 0 && (
            <div className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2">
                  Help & Center
                </p>
              )}

              {filteredSupportItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;

                const content = (
                  <NavLink
                    to={item.url}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group",
                      isActive
                        ? "bg-white text-[#207EC4] shadow-lg font-semibold"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-[#207EC4]" : "text-white/90"
                      )}
                    />
                    {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.title}</span>}
                  </NavLink>
                );

                if (isCollapsed && !isMobileOpen) {
                  return (
                    <Tooltip key={item.title} delayDuration={100}>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-900 text-white font-medium">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.title}>{content}</div>;
              })}
            </div>
          )}
        </nav>

        {/* Footer Profile & Quick Action */}
        <div className="p-3 border-t border-white/15 bg-black/10 flex-shrink-0">
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15",
              isCollapsed && !isMobileOpen && "justify-center p-2"
            )}
          >
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-9 w-9 rounded-lg bg-white text-[#207EC4] font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-white truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-white/70 capitalize font-medium">
                    {userRole}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1">
              {(!isCollapsed || isMobileOpen) && (
                <NavLink
                  to="/settings"
                  onClick={handleNavClick}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-red-500/20 hover:text-rose-200 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
