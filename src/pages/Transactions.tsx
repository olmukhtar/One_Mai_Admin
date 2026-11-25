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
import { ShieldAlert, ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

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
    return { from: user, fromLink: userLink, to: "Savings Circle", toLink: groupLink };
  }
  if (row.type === "group_payout") {
    return { from: "Savings Circle", fromLink: groupLink, to: user, toLink: userLink };
  }
  if (row.type === "payout") {
    return { from: user, fromLink: userLink, to: "External Bank Account" };
  }
  return { from: user, fromLink: userLink, to: "—" };
}

export default function Transactions() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [type, setType] = useState<"all" | "contribution" | "payout">("all");

  const [data, setData] = useState<TxnResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/transactions" } });
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
          } catch {}
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
  }, [token, page, status, type, navigate]);

  const rows = data?.transactions ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;
  const total = data?.totalTransactions ?? 0;

  const columns = [
    {
      key: "reference",
      label: "Reference Code",
      render: (v: string) => (
        <span className="font-mono text-xs font-semibold text-brand">{v}</span>
      ),
    },
    {
      key: "type",
      label: "Category",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <StatusBadge
          status={v === "completed" ? "Successful" : v}
          variant={v === "completed" ? "success" : v === "pending" ? "warning" : "destructive"}
        />
      ),
    },
    {
      key: "amount",
      label: "Transaction Value",
      render: (v: number) => (
        <span className="font-bold text-xs text-foreground">{ngn(v)}</span>
      ),
    },
    {
      key: "route",
      label: "Financial Flow",
      render: (_: any, row: Transaction) => {
        const route = getRoute(row);
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {route.fromLink ? (
                <Link to={route.fromLink} className="hover:text-brand transition-colors">
                  {route.from}
                </Link>
              ) : (
                route.from
              )}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {route.toLink ? (
                <Link to={route.toLink} className="hover:text-brand transition-colors">
                  {route.to}
                </Link>
              ) : (
                route.to
              )}
            </span>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Timestamp",
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">
          {new Date(v).toLocaleString("en-NG", {
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
    { label: "Inspect Transaction Receipt", onClick: (row: Transaction) => setSelectedTxn(row) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transaction Audit Ledger"
          subtitle="Real-time log of deposits, savings contributions, and monify payouts."
          breadcrumbs={[{ label: "Transactions" }]}
          showExportButtons
          rightSlot={
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="h-9 w-32 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Successful</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="h-9 w-36 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contribution">Contribution</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
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
          actionItems={actionItems}
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={total}
          onPageChange={setPage}
          loading={loading}
        />

        {/* Transaction Detail Modal */}
        <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
          <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-semibold flex items-center justify-between">
                <span>Transaction Receipt</span>
                <StatusBadge status={selectedTxn?.status} />
              </DialogTitle>
            </DialogHeader>

            {selectedTxn && (
              <div className="space-y-4 text-xs pt-2">
                <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 text-center space-y-1">
                  <span className="text-muted-foreground uppercase font-bold text-[10px]">
                    Total Amount
                  </span>
                  <div className="text-2xl font-extrabold text-brand">
                    {ngn(selectedTxn.amount)}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground block">
                    Ref: {selectedTxn.reference}
                  </span>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Category Type</span>
                    <span className="font-semibold capitalize text-foreground">{selectedTxn.type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Payment Channel</span>
                    <span className="font-semibold text-foreground">
                      {selectedTxn.paymentMethod || "Direct Transfer"} {selectedTxn.provider ? `(${selectedTxn.provider})` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">User Email</span>
                    <span className="font-medium text-foreground">{selectedTxn.user?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Timestamp</span>
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