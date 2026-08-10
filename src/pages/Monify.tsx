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
} from "@/components/ui/dialog";
import { ShieldAlert, RefreshCw, AlertCircle, CheckCircle2, Loader2, Send, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

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
  const { token } = useAuth();
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

  const limit = 20;

  const fetchTransactions = () => {
    if (!token) return;

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
          } catch {}
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => setData(j))
      .catch((e: any) => setErr(e?.message || "Failed to load transactions"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/monify" } });
      return;
    }

    fetchTransactions();
  }, [token, page, status, navigate]);

  const rows = data?.data?.transactions ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const columns = [
    {
      key: "reference",
      label: "Payout Reference",
      render: (v: string) => (
        <span className="font-mono text-xs font-bold text-brand">{v}</span>
      ),
    },
    {
      key: "user",
      label: "Recipient Member",
      render: (_: any, row: Transaction) => (
        <Link to={`/users/${row.user?._id}`} className="font-semibold text-xs text-foreground hover:text-brand transition-colors">
          {userLabel(row)}
        </Link>
      ),
    },
    {
      key: "groupId",
      label: "Savings Circle",
      render: (g: Group | undefined) =>
        g ? (
          <Link to={`/groups/${g._id}`} className="font-medium text-xs text-brand hover:underline">
            {g.name || g._id}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "amount",
      label: "Payout Amount",
      render: (v: number, row: Transaction) => (
        <span className="font-extrabold text-xs text-foreground">
          {formatAmount(v, row.currency)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Payout Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "createdAt",
      label: "Created Date",
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">
          {new Date(v).toLocaleDateString("en-NG", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Monify Payout Engine"
          subtitle="Automated disbursement queue for savings circle winners and member withdrawals."
          breadcrumbs={[{ label: "Monify Payouts" }]}
          showExportButtons
          rightSlot={
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Payouts</SelectItem>
                  <SelectItem value="completed">Successful</SelectItem>
                  <SelectItem value="pending">Pending Queue</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTransactions}
                disabled={loading}
                className="h-9 gap-1.5 rounded-xl text-xs font-medium border-border/80"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh Queue
              </Button>
            </div>
          }
        />

        {err && (
          <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
            {err}
          </div>
        )}

        <DataTable
          columns={columns}
          data={rows}
          actionItems={[
            { label: "Inspect Receipt", onClick: (row: Transaction) => setSelectedTxn(row) },
          ]}
          currentPage={page}
          totalPages={totalPages}
          totalEntries={total}
          onPageChange={setPage}
          loading={loading}
          selectable
          selectedIds={selectedTxnIds}
          onSelectedIdsChange={setSelectedTxnIds}
          bulkActions={[
            {
              label: "Process Batch Payouts",
              onClick: () => setShowBulkConfirm(true),
            },
          ]}
        />

        {/* Transaction Detail Modal */}
        <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
          <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-semibold flex items-center justify-between">
                <span>Payout Details</span>
                <StatusBadge status={selectedTxn?.status} />
              </DialogTitle>
            </DialogHeader>

            {selectedTxn && (
              <div className="space-y-4 text-xs pt-2">
                <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 text-center space-y-1">
                  <span className="text-muted-foreground uppercase font-bold text-[10px]">
                    Disbursement Amount
                  </span>
                  <div className="text-2xl font-extrabold text-brand">
                    {formatAmount(selectedTxn.amount, selectedTxn.currency)}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground block">
                    Ref: {selectedTxn.reference}
                  </span>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-semibold text-foreground">{userLabel(selectedTxn)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Payment Provider</span>
                    <span className="font-semibold text-foreground">{selectedTxn.provider || "Monify Engine"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Created Date</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedTxn.createdAt).toLocaleString("en-NG")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
