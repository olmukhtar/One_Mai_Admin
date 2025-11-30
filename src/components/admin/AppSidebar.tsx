import { useState } from "react";
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
  BookOpen
} from "lucide-react";

// Mock user role - in real app, this would come from context/auth
const currentUserRole = "Admin"; // Can be "Admin", "Account", "Front Desk", or "Customer Support"

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["Admin", "Account", "Front Desk", "Customer Support", "Marketing"] },
  { title: "Users", url: "/users", icon: Users, roles: ["Admin", "Account", "Front Desk", "Customer Support"] },
  { title: "Groups", url: "/groups", icon: Users2, roles: ["Admin", "Account", "Front Desk", "Customer Support"] },
  { title: "Affiliates", url: "/affiliates", icon: UserCheck, roles: ["Admin", "Account"] },
  { title: "Transactions", url: "/transactions", icon: CreditCard, roles: ["Admin", "Account", "Customer Support"] },
  { title: "Payout Requests", url: "/payout-requests", icon: Wallet, roles: ["Admin", "Account", "Customer Support"] },
  { title: "Resources", url: "/resources", icon: Folder, roles: ["Admin", "Account", "Front Desk", "Customer Support", "Marketing"] },
  { title: "Blog", url: "/blog", icon: BookOpen, roles: ["Admin", "Account", "Marketing"] },
  { title: "Create Admin", url: "/create-admin", icon: UserPlus, roles: ["Admin"] },
];

const reportsItems = [
  { title: "Group Contributions", url: "/reports/group-contributions", icon: TrendingUp, roles: ["Admin", "Account", "Front Desk", "Customer Support"] },
  { title: "Withdrawals", url: "/reports/withdrawals", icon: Wallet, roles: ["Admin", "Account", "Front Desk", "Customer Support"] },
  { title: "Members Activity", url: "/reports/members-activity", icon: Activity, roles: ["Admin", "Account", "Front Desk", "Customer Support"] },
  { title: "Circle Progress", url: "/reports/circle-progress", icon: Target, roles: ["Admin", "Account", "Front Desk", "Customer Support"] },
];

const supportItems = [
  { title: "Support", url: "/support", icon: HeadphonesIcon, roles: ["Admin", "Account", "Front Desk", "Customer Support"] }
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const reportsActive = pathname.startsWith("/reports");
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleReports = () => {
    setReportsOpen(!reportsOpen);
  };

  // Custom navigation handler for sidebar links that need state
  const handleNavigation = (url: string, fromPage?: string) => {
    if (fromPage) {
      navigate(url, { state: { fromPage } });
    } else {
      navigate(url);
    }
  };

  const baseItemClasses = "relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group cursor-pointer";
  const activeItemClasses = `${baseItemClasses} text-white bg-gradient-to-r from-[#1766a4] to-[#207EC4] shadow-lg ring-1 ring-white/20 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-white before:rounded-r-full`;
  const inactiveItemClasses = `${baseItemClasses} text-white hover:text-gray-800 hover:bg-white/90`;

  const iconClasses = "h-5 w-5 flex-shrink-0 transition-colors duration-200";
  const activeIconClasses = `${iconClasses} text-white`;
  const inactiveIconClasses = `${iconClasses} text-white group-hover:text-gray-800`;

  // Filter items based on user role
  const filteredMainItems = mainItems.filter(item => item.roles.includes(currentUserRole));
  const filteredReportsItems = reportsItems.filter(item => item.roles.includes(currentUserRole));
  const filteredSupportItems = supportItems.filter(item => item.roles.includes(currentUserRole));

  // Check if user has access to any reports
  const hasReportsAccess = filteredReportsItems.length > 0;

  return (
    <div className={`bg-[#207EC4] border-r border-white/10 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-screen flex flex-col`}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-[#207EC4] font-bold text-sm">A</span>
          </div>
          {!isCollapsed && (
            <span className="text-white font-semibold text-lg whitespace-nowrap">
              Admin Portal
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="text-white hover:text-gray-200 p-1 rounded transition-colors duration-200"
        >
          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {/* Main Items */}
          {filteredMainItems.map((item) => {
            // For Affiliates link, we don't need special state since it's the source page
            // For Users link, we also don't need special state since it's the source page
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === "/dashboard"}
                className={({ isActive }) =>
                  isActive ? activeItemClasses : inactiveItemClasses
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={isActive ? activeIconClasses : inactiveIconClasses} />
                    {!isCollapsed && (
                      <span className="truncate font-medium">
                        {item.title}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Reports Section - Only show if user has access to any reports */}
          {hasReportsAccess && (
            <div>
              <button
                onClick={toggleReports}
                className={reportsActive ? activeItemClasses : inactiveItemClasses}
              >
                <FileText className={reportsActive ? activeIconClasses : inactiveIconClasses} />
                {!isCollapsed && (
                  <>
                    <span className="truncate font-medium flex-1 text-left">
                      Reports
                    </span>
                    {reportsOpen ? (
                      <ChevronDown className="h-4 w-4 text-white group-hover:text-gray-800" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white group-hover:text-gray-800" />
                    )}
                  </>
                )}
              </button>

              {/* Reports Submenu */}
              {!isCollapsed && reportsOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {filteredReportsItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? activeItemClasses : inactiveItemClasses
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={isActive ? activeIconClasses : inactiveIconClasses} />
                          <span className="truncate font-medium">
                            {item.title}
                          </span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Support Items */}
          {filteredSupportItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                isActive ? activeItemClasses : inactiveItemClasses
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={isActive ? activeIconClasses : inactiveIconClasses} />
                  {!isCollapsed && (
                    <span className="truncate font-medium">
                      {item.title}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}