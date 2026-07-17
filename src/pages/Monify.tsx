// src/pages/Monify.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldAlert, RefreshCw, AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";

type User = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
};

type Group = {
  _id: string;
  name?: string;
  image?: string;
};

type Transaction = {
  _id: string;
  id: string;
  reference: string;
  user?: User;
  groupId?: Group;
  cycle?: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  paymentMethod?: string;
  provider?: string;
  metadata?: Record<string, any>;
  hubspotSynced?: boolean;
  notified?: boolean;
  createdAt: string;
  updatedAt: string;
  amountFormatted?: string;
};

type APIResponse = {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    total: number;
    limit: number;
    offset: number;
  };
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

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

function formatAmount(amount: number, currency: string = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function userLabel(row: Transaction) {
  const u = row.user;
  if (!u) return "—";
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || "—";
}

export default function Monify() {
  const token = useToken();
  const role = useUserRole();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "completed" | "pending" | "failed" | "reversed">("all");
  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const [initiating, setInitiating] = useState(false);
  const [payoutResult, setPayoutResult] = useState<any | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const { toast } = useToast();
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [initiatingBulk, setInitiatingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<any | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [txnToInitiate, setTxnToInitiate] = useState<Transaction | null>(null);
  const [initiatingSingle, setInitiatingSingle] = useState(false);
  const [singlePayoutError, setSinglePayoutError] = useState<string | null>(null);

  const [txnToAuthorize, setTxnToAuthorize] = useState<Transaction | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setPayoutResult(null);
    setPayoutError(null);
  }, [selectedTxn]);

  useEffect(() => {
    setSelectedTxnIds([]);
    setBulkResult(null);
    setBulkError(null);
    setTxnToInitiate(null);
    setSinglePayoutError(null);
    setTxnToAuthorize(null);
    setAuthCode("");
    setAuthError(null);
  }, [page, status, token]);

  const handleInitiatePayout = async () => {
    if (!selectedTxn || !token) return;

    setInitiating(true);
    setPayoutError(null);
    setPayoutResult(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/monify/payout/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId: selectedTxn._id }),
      });

      const resBody = await response.json();

      if (!response.ok) {
        throw new Error(resBody?.message || `Failed to initiate payout: ${response.status}`);
      }

      setPayoutResult(resBody);
      fetchTransactions();
    } catch (e: any) {
      setPayoutError(e.message || "Failed to initiate payout.");
    } finally {
      setInitiating(false);
    }
  };

  const handleInitiateSinglePayout = async () => {
    if (!txnToInitiate || !token) return;

    setInitiatingSingle(true);
    setSinglePayoutError(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/monify/payout/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId: txnToInitiate._id }),
      });

      const resBody = await response.json();

      if (!response.ok) {
        throw new Error(resBody?.message || `Failed to initiate payout: ${response.status}`);
      }

      toast({
        title: "Payout Initiated",
        description: resBody.message || "Successfully initiated payout.",
      });
      setTxnToInitiate(null);
      fetchTransactions();
    } catch (e: any) {
      setSinglePayoutError(e.message || "Failed to initiate payout.");
    } finally {
      setInitiatingSingle(false);
    }
  };

  const handleAuthorizePayout = async () => {
    if (!txnToAuthorize || !token) return;
    if (!authCode.trim()) {
      setAuthError("Authorization code is required.");
      return;
    }

    setAuthorizing(true);
    setAuthError(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/monify/payout/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: txnToAuthorize.reference,
          authorizationCode: authCode.trim(),
        }),
      });

      const resBody = await response.json();

      if (!response.ok) {
        throw new Error(resBody?.message || `Failed to authorize payout: ${response.status}`);
      }

      toast({
        title: "Payout Authorized",
        description: resBody.message || "Payout has been authorized successfully.",
      });
      setTxnToAuthorize(null);
      setAuthCode("");
      fetchTransactions();
      setSelectedTxn(null);
    } catch (e: any) {
      setAuthError(e.message || "Failed to authorize payout.");
    } finally {
      setAuthorizing(false);
    }
  };

  const handleInitiateBulkPayout = async () => {
    if (selectedTxnIds.length === 0 || !token) return;

    setInitiatingBulk(true);
    setBulkError(null);
    setBulkResult(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/monify/payout/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionIds: selectedTxnIds }),
      });

      const resBody = await response.json();

      if (!response.ok) {
        throw new Error(resBody?.message || `Failed to initiate payouts: ${response.status}`);
      }

      setBulkResult(resBody);
      toast({
        title: "Payouts Initiated",
        description: `Successfully initiated payouts for ${selectedTxnIds.length} requests.`,
      });
      setSelectedTxnIds([]);
      fetchTransactions();
      setShowBulkConfirm(false);
    } catch (e: any) {
      setBulkError(e.message || "Failed to initiate payouts.");
      toast({
        title: "Error Initiating Payouts",
        description: e.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setInitiatingBulk(false);
    }
  };

  const selectedTxns = useMemo(() => {
    const transactionsList = data?.data?.transactions ?? [];
    return transactionsList.filter(t => selectedTxnIds.includes(t._id));
  }, [data, selectedTxnIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedTxns.reduce((sum, t) => sum + t.amount, 0);
  }, [selectedTxns]);

  const limit = 20;

  // Endpoint permissions: admin and account roles only
  const canView = role === "admin" || role === "account";

  const fetchTransactions = () => {
    if (!token || !canView) return;

    setLoading(true);
    setErr(null);

    const offset = (page - 1) * limit;
    const url = new URL(`${API_BASE_URL}/transaction`);
    url.searchParams.set("type", "payout");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    if (status !== "all") {
      url.searchParams.set("status", status);
    }

    apiFetch(url.toString())
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
      .then((j: any) => {
        setData(j);
      })
      .catch((e: any) => {
        setErr(e?.message || "Failed to load transactions");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/monify" } });
      return;
    }

    if (!canView) {
      setErr("You don't have permission to view Monify payout transactions.");
      return;
    }

    fetchTransactions();
  }, [token, page, status, navigate, canView]);

  if (!canView) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Monify Payouts"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Monify Payouts" }]}
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
                  You don't have permission to view Monify payout transactions. This feature is restricted to Admin
                  and Account roles.
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
  const rows = data?.data?.transactions ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = page;

  const columns = [
    {
      key: "reference",
      label: "Reference",
      render: (v: string) => <span className="font-mono text-xs font-semibold text-slate-700">{v}</span>,
    },
    {
      key: "user",
      label: "User",
      render: (_: any, row: Transaction) => {
        const u = row.user;
        if (!u) return <span className="text-slate-400">—</span>;
        const name = userLabel(row);
        return (
          <div className="flex items-center gap-2">
            {u.image && (
              <img
                src={u.image.startsWith("http") ? u.image : `${IMAGE_BASE_URL}${u.image}`}
                alt={name}
                className="w-6 h-6 rounded-full object-cover border border-slate-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <Link to={`/users/${u._id}`} className="font-medium text-blue-600 hover:underline text-xs">
              {name}
            </Link>
          </div>
        );
      },
    },
    {
      key: "groupId",
      label: "Savings Circle / Group",
      render: (g: Group | undefined) => {
        if (!g) return <span className="text-slate-400">—</span>;
        return (
          <Link to={`/groups/${g._id}`} className="font-medium text-slate-700 hover:underline text-xs">
            {g.name || g._id}
          </Link>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      render: (v: number, row: Transaction) => (
        <span className="font-semibold text-slate-900">{formatAmount(v, row.currency)}</span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Method",
      render: (v: string, row: Transaction) => (
        <div className="text-xs text-slate-600">
          <span className="capitalize">{v || "—"}</span>
          {row.provider && <span className="text-slate-400 font-mono text-[10px] ml-1">({row.provider})</span>}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <StatusBadge status={v === "completed" ? "Successful" : v.charAt(0).toUpperCase() + v.slice(1)} />
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (v: string) => (
        <span className="text-xs text-slate-500">
          {new Date(v).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  const actionItems = [
    { label: "View Details", onClick: (row: Transaction) => setSelectedTxn(row) },
    {
      label: "Initiate Payout",
      show: (row: Transaction) => row.status === "pending",
      onClick: (row: Transaction) => {
        setSinglePayoutError(null);
        setTxnToInitiate(row);
      },
    },
    {
      label: "Authorize Payout",
      show: (row: Transaction) => row.status === "pending",
      onClick: (row: Transaction) => {
        setAuthError(null);
        setAuthCode("");
        setTxnToAuthorize(row);
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Monify Payouts"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Monify Payouts" }]}
            showSearch={false}
          />
          <div className="flex items-center gap-3">
            {selectedTxnIds.length > 0 && (
              <Button
                onClick={() => {
                  setBulkResult(null);
                  setBulkError(null);
                  setShowBulkConfirm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 shadow-sm border-0"
                size="sm"
              >
                <Send className="h-4 w-4" />
                Initiate Selected ({selectedTxnIds.length})
              </Button>
            )}
            <Button
              onClick={fetchTransactions}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2 border-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Status Filter:</span>
            <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Successful</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <DataTable
            columns={columns}
            data={loading ? [] : rows}
            actionItems={actionItems}
            currentPage={currentPage}
            totalPages={totalPages}
            totalEntries={total}
            onPageChange={(newPage) => setPage(newPage)}
            loading={loading}
            searchPlaceholder="Filter current view..."
            selectable={true}
            selectedIds={selectedTxnIds}
            onSelectedIdsChange={setSelectedTxnIds}
            isRowSelectable={(row) => row.status === "pending"}
            getRowId={(row) => row._id}
          />
        </div>

        {/* Details Dialog */}
        <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
              <DialogTitle className="font-mono text-sm text-slate-600 flex items-center justify-between">
                <span>Reference: {selectedTxn?.reference}</span>
              </DialogTitle>
            </DialogHeader>

            {selectedTxn && (
              <div className="space-y-6 text-sm">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Transaction Info</h4>
                  <dl className="grid grid-cols-2 gap-y-3 gap-x-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <dt className="text-slate-500">Transaction ID</dt>
                    <dd className="font-mono text-xs text-slate-800 break-all">{selectedTxn._id}</dd>

                    <dt className="text-slate-500">Type</dt>
                    <dd><StatusBadge status={selectedTxn.type} /></dd>

                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <StatusBadge
                        status={selectedTxn.status === "completed" ? "Successful" : selectedTxn.status.charAt(0).toUpperCase() + selectedTxn.status.slice(1)}
                      />
                    </dd>

                    <dt className="text-slate-500">Amount</dt>
                    <dd className="font-semibold text-slate-900">{formatAmount(selectedTxn.amount, selectedTxn.currency)}</dd>

                    {selectedTxn.amountFormatted && (
                      <>
                        <dt className="text-slate-500">Formatted Amount</dt>
                        <dd className="text-slate-700">{selectedTxn.amountFormatted}</dd>
                      </>
                    )}

                    <dt className="text-slate-500">Payment Method</dt>
                    <dd className="capitalize text-slate-800">{selectedTxn.paymentMethod || "—"}</dd>

                    <dt className="text-slate-500">Provider</dt>
                    <dd className="font-mono text-xs text-slate-800">{selectedTxn.provider || "—"}</dd>

                    <dt className="text-slate-500">Created At</dt>
                    <dd className="text-slate-700">{new Date(selectedTxn.createdAt).toLocaleString("en-US")}</dd>

                    <dt className="text-slate-500">Updated At</dt>
                    <dd className="text-slate-700">{new Date(selectedTxn.updatedAt).toLocaleString("en-US")}</dd>
                  </dl>
                </div>

                {selectedTxn.user && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">User Details</h4>
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {selectedTxn.user.image && (
                        <img
                          src={selectedTxn.user.image.startsWith("http") ? selectedTxn.user.image : `${IMAGE_BASE_URL}${selectedTxn.user.image}`}
                          alt={userLabel(selectedTxn)}
                          className="w-12 h-12 rounded-full object-cover border border-white shadow-sm"
                        />
                      )}
                      <div>
                        <div className="font-medium text-slate-950">{userLabel(selectedTxn)}</div>
                        <div className="text-xs text-slate-500 mb-1">{selectedTxn.user.email}</div>
                        <Link
                          to={`/users/${selectedTxn.user._id}`}
                          className="text-xs text-blue-600 hover:underline font-semibold"
                          onClick={() => setSelectedTxn(null)}
                        >
                          View user profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTxn.groupId && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Savings Circle</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-950">{selectedTxn.groupId.name || "Unnamed Circle"}</div>
                        <div className="text-xs text-slate-500">ID: {selectedTxn.groupId._id}</div>
                        {typeof selectedTxn.cycle === "number" && (
                          <div className="text-xs text-slate-600 mt-1">
                            Cycle number: <span className="font-semibold text-slate-700">{selectedTxn.cycle}</span>
                          </div>
                        )}
                      </div>
                      <Link
                        to={`/groups/${selectedTxn.groupId._id}`}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                        onClick={() => setSelectedTxn(null)}
                      >
                        View circle details →
                      </Link>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Sync & Notification State</h4>
                  <dl className="grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <dt className="text-slate-500">HubSpot Synced</dt>
                    <dd className="font-medium">
                      {selectedTxn.hubspotSynced ? (
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100">Synced</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">Not Synced</span>
                      )}
                    </dd>

                    <dt className="text-slate-500">User Notified</dt>
                    <dd className="font-medium">
                      {selectedTxn.notified ? (
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100">Notified</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">Not Notified</span>
                      )}
                    </dd>
                  </dl>
                </div>

                {selectedTxn.metadata && Object.keys(selectedTxn.metadata).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Metadata</h4>
                    <pre className="text-xs font-mono bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedTxn.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Initiate Payout Action Section */}
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payout Action</h4>

                  {payoutError && (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>{payoutError}</span>
                    </div>
                  )}

                  {payoutResult && (
                    <div className="text-xs text-green-600 bg-green-50 p-4 rounded-xl border border-green-100 space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{payoutResult.message || "Payout initiated successfully!"}</span>
                      </div>
                      {payoutResult.data?.data && (
                        <dl className="grid grid-cols-2 gap-y-1 gap-x-2 mt-2 pt-2 border-t border-green-150 text-[11px] text-green-700">
                          <dt className="font-medium text-green-800">Status</dt>
                          <dd className="font-mono uppercase font-semibold">{payoutResult.data.data.status || "—"}</dd>

                          <dt className="font-medium text-green-800">Reference</dt>
                          <dd className="font-mono truncate">{payoutResult.data.data.reference || "—"}</dd>

                          <dt className="font-medium text-green-800">Bank Reference</dt>
                          <dd className="font-mono truncate">{payoutResult.data.data.transactionReference || "—"}</dd>

                          <dt className="font-medium text-green-800">Destination Account</dt>
                          <dd className="truncate">
                            {payoutResult.data.data.destinationAccountName} ({payoutResult.data.data.destinationAccountNumber})
                          </dd>

                          <dt className="font-medium text-green-800">Amount</dt>
                          <dd className="font-semibold">{formatAmount(payoutResult.data.data.amount, selectedTxn.currency)}</dd>
                        </dl>
                      )}
                      
                      <Button
                        onClick={() => {
                          setAuthError(null);
                          setAuthCode("");
                          setTxnToAuthorize(selectedTxn);
                        }}
                        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200"
                        size="sm"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Authorize Payout (OTP)
                      </Button>
                    </div>
                  )}

                  {!payoutResult && (
                    <Button
                      onClick={handleInitiatePayout}
                      disabled={initiating}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200"
                    >
                      {initiating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Initiating payout...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Initiate Payout via Monnify
                        </>
                      )}
                    </Button>
                  )}
                </div>

              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Payout Confirmation Dialog */}
        <Dialog open={showBulkConfirm} onOpenChange={(open) => !open && setShowBulkConfirm(false)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Confirm Batch Payout Initiation
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                You are about to initiate payouts for multiple selected transactions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Count</span>
                  <span className="font-semibold text-slate-800">{selectedTxnIds.length} requests</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500">Total Amount</span>
                  <span className="font-bold text-slate-950">{formatAmount(selectedTotalAmount)}</span>
                </div>
              </div>

              {bulkError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              <div className="text-xs text-slate-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100/60">
                <p className="font-medium text-blue-800 mb-1">Important Notice</p>
                This will submit a batch disbursement request to Monnify. If bank account validation fails for any of the records, or if their statuses are not pending, the batch will be rejected.
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowBulkConfirm(false)}
                disabled={initiatingBulk}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInitiateBulkPayout}
                disabled={initiatingBulk}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                {initiatingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initiating Payouts...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Confirm & Initiate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Single Payout Confirmation Dialog */}
        <Dialog open={!!txnToInitiate} onOpenChange={(open) => !open && setTxnToInitiate(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Confirm Payout Initiation
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                You are about to initiate a payout for this transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {txnToInitiate && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">User</span>
                    <span className="font-semibold text-slate-800">{userLabel(txnToInitiate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference</span>
                    <span className="font-mono text-xs text-slate-800 truncate max-w-[200px]">{txnToInitiate.reference}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-bold text-slate-950">{formatAmount(txnToInitiate.amount, txnToInitiate.currency)}</span>
                  </div>
                </div>
              )}

              {singlePayoutError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span>{singlePayoutError}</span>
                </div>
              )}

              <div className="text-xs text-slate-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100/60">
                <p className="font-medium text-blue-800 mb-1">Important Notice</p>
                This will submit a disbursement request to Monnify. Please ensure the user's payment method and destination details are correct.
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setTxnToInitiate(null)}
                disabled={initiatingSingle}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInitiateSinglePayout}
                disabled={initiatingSingle}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                {initiatingSingle ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initiating Payout...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Confirm & Initiate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Authorize Payout Dialog */}
        <Dialog open={!!txnToAuthorize} onOpenChange={(open) => !open && setTxnToAuthorize(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Authorize Payout
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Enter the authorization code / OTP to release this payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {txnToAuthorize && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">User</span>
                    <span className="font-semibold text-slate-800">{userLabel(txnToAuthorize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference</span>
                    <span className="font-mono text-xs text-slate-800 truncate max-w-[200px]">{txnToAuthorize.reference}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-bold text-slate-950">{formatAmount(txnToAuthorize.amount, txnToAuthorize.currency)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Authorization Code (OTP)
                </label>
                <Input
                  type="text"
                  placeholder="Enter Monnify OTP code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  className="w-full border-slate-200 rounded-xl animate-none"
                  disabled={authorizing}
                />
              </div>

              {authError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setTxnToAuthorize(null)}
                disabled={authorizing}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAuthorizePayout}
                disabled={authorizing || !authCode.trim()}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              >
                {authorizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Authorize & Release
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
