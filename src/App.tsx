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
import Affiliates from "./pages/Affiliates";
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
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PayoutRequests from "./pages/PayoutRequests";
import CreateAdmin from "./pages/CreateAdmin";
import Resources from "./pages/Resources";
import BlogManagement from "./pages/BlogManagement";
import KnowledgeBase from "./pages/KnowledgeBase";

const queryClient = new QueryClient();
const AUTH_STORAGE_KEY = "admin_auth";
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

function isAuthed() {
  return (
    !!localStorage.getItem(AUTH_STORAGE_KEY) ||
    !!sessionStorage.getItem(AUTH_STORAGE_KEY)
  );
}

function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

// Hook to handle inactivity logout
function useInactivityLogout() {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  const resetTimer = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set timeout if user is authenticated and not on login page
    if (isAuthed() && location.pathname !== "/") {
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
  }, [location.pathname]);
}

function InactivityMonitor({ children }: { children: React.ReactNode }) {
  useInactivityLogout();
  return <>{children}</>;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RootLogin() {
  return isAuthed() ? <Navigate to="/dashboard" replace /> : <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InactivityMonitor>
          <Routes>
            {/* Root is LOGIN */}
            <Route path="/" element={<RootLogin />} />

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
              path="/affiliates"
              element={
                <RequireAuth>
                  <Affiliates />
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
              path="/payout-requests"
              element={
                <RequireAuth>
                  <PayoutRequests />
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

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </InactivityMonitor>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
