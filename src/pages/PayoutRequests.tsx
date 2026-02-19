// src/pages/PayoutRequests.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ShieldAlert, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

type PayoutRequest = {
  _id: string;
  user?: { _id: string; email?: string } | string | null;
  requester?: { _id: string; email?: string; firstName?: string; lastName?: string } | string | null;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed" | "failed" | string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  payoutRequests: PayoutRequest[];
  currentPage: number;
  totalPages: number;
  totalPayoutRequests: number;
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

const BASE = API_BASE_URL;
const ENDPOINT = `${BASE}/admin/payout-requests`;
const STATUS_ENDPOINT = `${BASE}/admin/payout-requests/status`;

function useToken() {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.token as string | null;
    } catch {
      return null;
    }
  }, []);
}

function useUserRole(): UserRole | null {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.role as UserRole) || null;
    } catch {
      return null;
    }
  }, []);
}

function eur(n: number) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `€${Math.round(n).toLocaleString()}`;
  }
}

export default function PayoutRequests() {
  const token = useToken();
  const role = useUserRole();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    status: string;
    amount: number;
  } | null>(null);

  // Permission checks based on roles
  // getAllPayoutRequests: admin (full), account (full), customer_support (view only), front_desk (no access)
  // updatePayoutRequestStatus: admin (full), account (full), customer_support (no access), front_desk (no access)
  const canView = role === "admin" || role === "account" || role === "customer_support";
  const canUpdate = role === "admin" || role === "account";
  const isViewOnly = role === "customer_support";

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, date]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/payout-requests" } });
      return;
    }

    if (!canView) {
      setErr("You don't have permission to view payout requests.");
      return;
    }

    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    const u = new URL(ENDPOINT);
    u.searchParams.set("page", String(page));
    if (debouncedSearch) {
      u.searchParams.set("search", debouncedSearch);
    }
    if (statusFilter && statusFilter !== "all") {
      u.searchParams.set("status", statusFilter);
    }
    if (date?.from) {
      u.searchParams.set("startDate", format(date.from, "yyyy-MM-dd"));
    }
    if (date?.to) {
      u.searchParams.set("endDate", format(date.to, "yyyy-MM-dd"));
    }

    apiFetch(u.toString(), {
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load payout requests: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = `Failed to load payout requests: ${j.message}`;
          } catch { }
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: ApiResponse) => setData(j))
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load payout requests");
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, page, navigate, canView, debouncedSearch, statusFilter, date]);

  const handleStatusUpdate = async (id: string, status: "completed" | "failed") => {
    if (!token) return;

    // Check if user can update
    if (!canUpdate) {
      setUpdateError("You don't have permission to update payout requests.");
      return;
    }

    setUpdatingId(id);
    setUpdateError(null);

    try {
      const response = await apiFetch(STATUS_ENDPOINT, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to update payout request: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMsg = errorData.message;
        } catch { }
        throw new Error(errorMsg);
      }

      const result = await response.json();

      // Update local state
      if (data) {
        const updatedRequests = data.payoutRequests.map((req) =>
          req._id === id ? { ...req, status: result.payoutRequest.status } : req
        );
        setData({ ...data, payoutRequests: updatedRequests });
      }

      setConfirmAction(null);
    } catch (error: any) {
      setUpdateError(error.message || "Failed to update payout request");
    } finally {
      setUpdatingId(null);
    }
  };

  const openConfirmation = (row: PayoutRequest, status: "completed" | "failed") => {
    if (!canUpdate) {
      setUpdateError("You don't have permission to update payout requests.");
      return;
    }
    setConfirmAction({ id: row._id, status, amount: row.amount });
    setUpdateError(null);
  };

  // If user doesn't have access, show permission denied
  if (!canView) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Payout Requests"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Payout Requests" }]}
            searchPlaceholder=""
            showSearch={false}
          />

          <Card className="max-w-2xl border border-slate-100 shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-red-100 p-3 mb-4">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md">
                  You don't have permission to view payout requests. This feature is only available to Admin,
                  Account, and Customer Support roles.
                </p>
                <Button onClick={() => navigate("/dashboard")} variant="outline">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const rows = data?.payoutRequests ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;
  const total = data?.totalPayoutRequests ?? 0;

  const columns = [
    {
      key: "request",
      label: "Request ID",
      render: (_: any, row: PayoutRequest) => (
        <span className="font-mono text-xs">{row._id.slice(-8)}</span>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (_: any, row: PayoutRequest) => {
        const u = row.requester || row.user;
        if (!u) return <span className="text-slate-500">Unknown</span>;

        const id = typeof u === "string" ? u : u._id;
        const display = typeof u === "string"
          ? u
          : (u.email || (u as any).firstName || id);

        return (
          <Link to={`/users/${id}`} className="text-blue-600 hover:underline font-mono text-xs">
            {display}
          </Link>
        );
      },
    },
    { key: "amount", label: "Amount", render: (v: number) => eur(v) },
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
    {
      key: "createdAt",
      label: "Requested",
      render: (v: string) =>
        new Date(v).toLocaleString("en-NG", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: PayoutRequest) => {
        const isPending = row.status === "pending";
        const isUpdating = updatingId === row._id;

        if (!isPending || !canUpdate) return <span className="text-slate-400 text-xs">-</span>;

        return (
          <div className="flex gap-2">
            <button
              onClick={() => openConfirmation(row, "completed")}
              disabled={isUpdating}
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => openConfirmation(row, "failed")}
              disabled={isUpdating}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
              title="Reject"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // Action items - only include approve/reject for users who can update
  const actionItems = canUpdate
    ? [
      {
        label: "Approve",
        onClick: (row: PayoutRequest) => openConfirmation(row, "completed"),
        disabled: (row: PayoutRequest) => row.status !== "pending",
      },
      {
        label: "Reject",
        onClick: (row: PayoutRequest) => openConfirmation(row, "failed"),
        disabled: (row: PayoutRequest) => row.status !== "pending",
      },
      {
        label: "View User",
        onClick: (row: PayoutRequest) => {
          const u = row.requester || row.user;
          const id = typeof u === "string" ? u : u?._id;
          if (id) navigate(`/users/${id}`);
        },
      },
    ]
    : [
      {
        label: "View User",
        onClick: (row: PayoutRequest) => {
          const u = row.requester || row.user;
          const id = typeof u === "string" ? u : u?._id;
          if (id) navigate(`/users/${id}`);
        },
      },
    ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Payout Requests"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Payout Requests" }]}
          showSearch={false}
        />

        {/* Filters */}
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by user or id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
        </div>

        {debouncedSearch && (
          <div className="text-sm text-slate-600">
            Found {total} requests
          </div>
        )}

        {isViewOnly && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            You have view-only access to payout requests. You cannot approve or reject requests.
          </div>
        )}

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{err}</div>
        )}

        {updateError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
            {updateError}
          </div>
        )}

        <DataTable
          columns={columns}
          data={loading ? [] : rows}
          actionItems={actionItems}
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={total}
          onPageChange={(newPage) => setPage(newPage)}
          loading={loading}
        />
      </div>

      {/* Confirmation Modal - Only show if user can update */}
      {confirmAction && canUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Confirm {confirmAction.status === "completed" ? "Approval" : "Rejection"}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to {confirmAction.status === "completed" ? "approve" : "reject"} this
              payout request for {eur(confirmAction.amount)}?
            </p>

            {updateError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {updateError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
                disabled={!!updatingId}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusUpdate(confirmAction.id, confirmAction.status as "completed" | "failed")}
                disabled={!!updatingId}
                className={
                  confirmAction.status === "completed"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {updatingId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${confirmAction.status === "completed" ? "Approval" : "Rejection"}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}