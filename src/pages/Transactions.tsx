// /src/pages/Transactions.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

type Transaction = {
  _id: string;
  reference: string;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  groupId?: string;
  cycle?: number;
  amount: number;
  currency?: string;
  type: "contribute" | "group_payout" | "payout" | string;
  status: "completed" | "pending" | "failed" | string;
  paymentMethod?: string;
  provider?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  amountFormatted?: string;
};

type TxnResponse = {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalTransactions: number;
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const BASE = API_BASE_URL;
const URL_TXNS = `${BASE}/transaction/all`;

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

function ngn(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₦${Math.round(n).toLocaleString()}`;
  }
}

function userLabel(row: Transaction) {
  const u = row.user;
  if (!u) return "—";
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || "—";
}

// The API doesn't return explicit from/to fields - derive the money route
// from the transaction `type` instead (contribute = user -> group,
// group_payout = group -> user, payout = user wallet -> external bank).
function getRoute(row: Transaction): {
  from: string;
  fromLink?: string;
  to: string;
  toLink?: string;
} {
  const user = userLabel(row);
  const userLink = row.user?._id ? `/users/${row.user._id}` : undefined;
  const groupLink = row.groupId ? `/groups/${row.groupId}` : undefined;

  if (row.type === "contribute") {
    return { from: user, fromLink: userLink, to: "Group", toLink: groupLink };
  }
  if (row.type === "group_payout") {
    return { from: "Group", fromLink: groupLink, to: user, toLink: userLink };
  }
  if (row.type === "payout") {
    return { from: user, fromLink: userLink, to: "Bank Account" };
  }
  return { from: user, fromLink: userLink, to: "—" };
}

export default function Transactions() {
  const token = useToken();
  const role = useUserRole();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [type, setType] = useState<"all" | "contribution" | "payout">("all");

  const [data, setData] = useState<TxnResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Permission checks based on roles
  // getAllTransactions: admin (full), account (full), customer_support (view only), front_desk (no access)
  const canView = role === "admin" || role === "account" || role === "customer_support";
  const isViewOnly = role === "customer_support";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/transactions" } });
      return;
    }

    if (!canView) {
      setErr("You don't have permission to view transactions.");
      return;
    }

    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    const url = new URL(URL_TXNS);
    url.searchParams.set("page", String(page));
    if (status !== "all") url.searchParams.set("status", status);
    if (type !== "all") url.searchParams.set("type", type);

    apiFetch(url.toString(), {
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load transactions: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = `Failed to load transactions: ${j.message}`;
          } catch { }
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => setData(j.data || j))
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load transactions");
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, page, status, type, navigate, canView]);

  // If user doesn't have access, show permission denied
  if (!canView) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Transactions"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Transactions" }]}
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
                  You don't have permission to view transactions. This feature is only available to Admin,
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

  const rows = data?.transactions ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;
  const total = data?.totalTransactions ?? 0;

  const columns = [
    { key: "reference", label: "Reference", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    {
      key: "type",
      label: "Type",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <StatusBadge status={v === "completed" ? "Successful" : v.charAt(0).toUpperCase() + v.slice(1)} />
      ),
    },
    { key: "paymentMethod", label: "Method", render: (v: string) => v || "—" },
    { key: "amount", label: "Amount", render: (v: number) => ngn(v) },
    {
      key: "route",
      label: "Route",
      render: (_: any, row: Transaction) => {
        const route = getRoute(row);
        return (
          <div className="text-xs">
            <div className="text-slate-500">from</div>
            <div className="font-medium">
              {route.fromLink ? <Link to={route.fromLink} className="hover:underline">{route.from}</Link> : route.from}
            </div>
            <div className="text-slate-500 mt-1">to</div>
            <div className="font-medium">
              {route.toLink ? <Link to={route.toLink} className="hover:underline">{route.to}</Link> : route.to}
            </div>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Date",
      render: (v: string) =>
        new Date(v).toLocaleString("en-NG", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  const actionItems = [
    { label: "View Details", onClick: (row: Transaction) => setSelectedTxn(row) },
    ...(isViewOnly ? [] : [
      { label: "Flag Transaction", onClick: (row: Transaction) => console.log("Flag", row._id) },
    ]),
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transactions"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Transactions" }]}
          showSearch={false}
        />

        {isViewOnly && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            You have view-only access to transactions. You cannot perform any actions on transactions.
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Successful</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type</span>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="contribution">Contribution</SelectItem>
                <SelectItem value="payout">Payout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{err}</div>
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

        <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{selectedTxn?.reference}</DialogTitle>
            </DialogHeader>
            {selectedTxn && (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <dt className="text-slate-500">Type</dt>
                  <dd><StatusBadge status={selectedTxn.type} /></dd>

                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <StatusBadge
                      status={selectedTxn.status === "completed" ? "Successful" : selectedTxn.status.charAt(0).toUpperCase() + selectedTxn.status.slice(1)}
                    />
                  </dd>

                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium">{ngn(selectedTxn.amount)} {selectedTxn.currency && selectedTxn.currency !== "NGN" ? `(${selectedTxn.currency})` : ""}</dd>

                  <dt className="text-slate-500">Method</dt>
                  <dd>{selectedTxn.paymentMethod || "—"}{selectedTxn.provider ? ` via ${selectedTxn.provider}` : ""}</dd>

                  <dt className="text-slate-500">From</dt>
                  <dd>
                    {(() => {
                      const r = getRoute(selectedTxn);
                      return r.fromLink ? <Link to={r.fromLink} className="hover:underline">{r.from}</Link> : r.from;
                    })()}
                  </dd>

                  <dt className="text-slate-500">To</dt>
                  <dd>
                    {(() => {
                      const r = getRoute(selectedTxn);
                      return r.toLink ? <Link to={r.toLink} className="hover:underline">{r.to}</Link> : r.to;
                    })()}
                  </dd>

                  {selectedTxn.user && (
                    <>
                      <dt className="text-slate-500">User</dt>
                      <dd>{userLabel(selectedTxn)} {selectedTxn.user.email ? `(${selectedTxn.user.email})` : ""}</dd>
                    </>
                  )}

                  {selectedTxn.groupId && (
                    <>
                      <dt className="text-slate-500">Group</dt>
                      <dd>
                        <Link to={`/groups/${selectedTxn.groupId}`} className="hover:underline font-mono text-xs">
                          {selectedTxn.groupId}
                        </Link>
                        {typeof selectedTxn.cycle === "number" && <span className="text-slate-500"> · cycle {selectedTxn.cycle}</span>}
                      </dd>
                    </>
                  )}

                  <dt className="text-slate-500">Created</dt>
                  <dd>{new Date(selectedTxn.createdAt).toLocaleString("en-NG")}</dd>

                  <dt className="text-slate-500">Updated</dt>
                  <dd>{new Date(selectedTxn.updatedAt).toLocaleString("en-NG")}</dd>
                </dl>

                {selectedTxn.metadata && Object.keys(selectedTxn.metadata).length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-1">Metadata</div>
                    <pre className="text-xs bg-slate-50 border border-slate-100 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedTxn.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}