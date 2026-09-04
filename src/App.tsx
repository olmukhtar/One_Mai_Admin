import React, { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import UserDetails from "./pages/UserDetails";
import AffiliateApplications from "./pages/AffiliateApplications";
import AffiliateApplicationDetail from "./pages/AffiliateApplicationDetail";
import Support from "./pages/Support";
import Transactions from "./pages/Transactions";
import CircleManagement from "./pages/CircleManagement";
import GroupContributions from "./pages/reports/GroupContributions";
import Withdrawals from "./pages/reports/Withdrawals";
import MembersActivity from "./pages/reports/MembersActivity";
import CircleProgress from "./pages/reports/CircleProgress";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

import CreateAdmin from "./pages/CreateAdmin";
import Campaigns from "./pages/Campaigns";
import Resources from "./pages/Resources";
import BlogManagement from "./pages/BlogManagement";
import MediaLibrary from "./pages/MediaLibrary";
import KnowledgeBase from "./pages/KnowledgeBase";
import CreateBlog from "./pages/CreateBlog";
import EditBlog from "./pages/EditBlog";
import Monify from "./pages/Monify";
import Unauthorized from "./pages/Unauthorized";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Hook to handle inactivity logout
function useInactivityLogout() {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const resetTimer = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set timeout if user is authenticated and not on login page
    if (isAuthenticated && location.pathname !== "/") {
      timeoutRef.current = setTimeout(() => {
        logout();
        navigate("/", { replace: true });
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    // Events that indicate user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

    // Reset timer on any activity
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, isAuthenticated]);
}

function InactivityMonitor({ children }: { children: React.ReactNode }) {
  useInactivityLogout();
  return <>{children}</>;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (role === "customer_support" || role === "support") {
    const path = location.pathname;
    const isAllowed = 
      path === "/users" || path.startsWith("/users/") ||
      path === "/groups" || path.startsWith("/groups/") ||
      path === "/support" || path.startsWith("/support/") ||
      path === "/knowledge-base" || path.startsWith("/knowledge-base/") ||
      path === "/profile" || path === "/settings" || path === "/notifications" || path === "/unauthorized";

    if (!isAllowed) {
      return <Navigate to="/users" replace />;
    }
  }

  return children;
}

function RootLogin() {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    if (role === "customer_support" || role === "support") return <Navigate to="/users" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Login />;
}

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InactivityMonitor>
            <Routes>
            {/* Root is LOGIN */}
            <Route path="/" element={<RootLogin />} />
            <Route path="/login" element={<RootLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected app routes */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth>
                  <Users />
                </RequireAuth>
              }
            />
            <Route
              path="/users/:id"
              element={
                <RequireAuth>
                  <UserDetails />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <Notifications />
                </RequireAuth>
              }
            />
            <Route
              path="/affiliate-applications"
              element={
                <RequireAuth>
                  <AffiliateApplications />
                </RequireAuth>
              }
            />
            <Route
              path="/affiliate-applications/:id"
              element={
                <RequireAuth>
                  <AffiliateApplicationDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/groups"
              element={
                <RequireAuth>
                  <Groups />
                </RequireAuth>
              }
            />
            <Route
              path="/groups/:id"
              element={
                <RequireAuth>
                  <GroupDetails />
                </RequireAuth>
              }
            />
            <Route
              path="/circle-management"
              element={
                <RequireAuth>
                  <CircleManagement />
                </RequireAuth>
              }
            />
            <Route
              path="/transactions"
              element={
                <RequireAuth>
                  <Transactions />
                </RequireAuth>
              }
            />
            <Route
              path="/monify"
              element={
                <RequireAuth>
                  <Monify />
                </RequireAuth>
              }
            />
            <Route
              path="/campaigns"
              element={
                <RequireAuth>
                  <Campaigns />
                </RequireAuth>
              }
            />
            <Route
              path="/resources"
              element={
                <RequireAuth>
                  <Resources />
                </RequireAuth>
              }
            />
            <Route
              path="/blog"
              element={
                <RequireAuth>
                  <BlogManagement />
                </RequireAuth>
              }
            />
            <Route
              path="/media"
              element={
                <RequireAuth>
                  <MediaLibrary />
                </RequireAuth>
              }
            />
            <Route
              path="/blog/create"
              element={
                <RequireAuth>
                  <CreateBlog />
                </RequireAuth>
              }
            />
            <Route
              path="/blog/edit/:id"
              element={
                <RequireAuth>
                  <EditBlog />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/group-contributions"
              element={
                <RequireAuth>
                  <GroupContributions />
                </RequireAuth>
              }
            />
            <Route
              path="/create-admin"
              element={
                <RequireAuth>
                  <CreateAdmin />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/withdrawals"
              element={
                <RequireAuth>
                  <Withdrawals />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/members-activity"
              element={
                <RequireAuth>
                  <MembersActivity />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/circle-progress"
              element={
                <RequireAuth>
                  <CircleProgress />
                </RequireAuth>
              }
            />
            <Route
              path="/support"
              element={
                <RequireAuth>
                  <Support />
                </RequireAuth>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <RequireAuth>
                  <KnowledgeBase />
                </RequireAuth>
              }
            />

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </InactivityMonitor>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
