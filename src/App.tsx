import React from "react";
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

function isAuthed() {
  return (
    !!localStorage.getItem(AUTH_STORAGE_KEY) ||
    !!sessionStorage.getItem(AUTH_STORAGE_KEY)
  );
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
