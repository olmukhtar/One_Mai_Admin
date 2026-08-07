import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  CreditCard,
  Users,
  Wallet,
  UserCheck,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type StatsResponse = {
  stats: {
    totalUsers: number;
    totalGroups: number;
    activeGroups: number;
    pendingPayoutRequests: number;
    completedPayouts: number;
    totalContributions: number;
    totalTransactionValue: number;
    platformRevenue: number;
  };
  recentTransactions: Array<{
    _id: string;
    reference: string;
    fromEntity: string;
    fromType: string;
    toEntity: string;
    toType: string;
    amount: number;
    type: "contribution" | "payout" | string;
    status: "completed" | "pending" | "failed" | string;
    paymentMethod?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }>;
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

const STATS_URL = `${API_BASE_URL}/admin/dashboard/stats`;

function useAuthToken() {
  return useMemo(() => {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) ||
      sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.token as string | null;
    } catch {
      return null;
    }
  }, []);
}

function useUserRole(): UserRole | null {
  return useMemo(() => {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) ||
      sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.role as UserRole) || null;
    } catch {
      return null;
    }
  }, []);
}

function formatNgn(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₦${Math.round(n).toLocaleString()}`;
  }
}

function KPIs({
  data,
  role,
  loading,
}: {
  data: StatsResponse["stats"] | null;
  role: UserRole | null;
  loading: boolean;
}) {
  const canSeeFinancials = role === "admin" || role === "account";
  const canSeePendingPayouts = role === "admin" || role === "account";

  const items = [
    {
      title: "Total Registered Users",
      value: data ? data.totalUsers.toLocaleString() : "0",
      icon: Users,
      trend: "+12.4%",
      subtitle: "vs last month",
      visible: true,
    },
    {
      title: "Savings Circles",
      value: data ? data.totalGroups.toLocaleString() : "0",
      icon: Layers,
      trend: "+8.2%",
      subtitle: "Total created",
      visible: true,
    },
    {
      title: "Active Circles",
      value: data ? data.activeGroups.toLocaleString() : "0",
      icon: UserCheck,
      trend: "Live",
      subtitle: "Currently contributing",
      visible: true,
    },
    {
      title: "Pending Payouts",
      value: data ? data.pendingPayoutRequests.toLocaleString() : "0",
      icon: Wallet,
      trend: "Action Required",
      trendDirection: "down" as const,
      subtitle: "Requests queued",
      visible: canSeePendingPayouts,
    },
    {
      title: "Total Txn Volume",
      value: data ? formatNgn(data.totalTransactionValue) : "₦0",
      icon: TrendingUp,
      trend: "+18.6%",
      subtitle: "Gross volume",
      visible: canSeeFinancials,
    },
    {
      title: "Platform Revenue",
      value: data ? formatNgn(data.platformRevenue) : "₦0",
      icon: ArrowUpRight,
      trend: "+15.3%",
      subtitle: "Net platform earnings",
      visible: canSeeFinancials,
    },
  ].filter((item) => item.visible);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {items.map((item) => (
        <KpiCard
          key={item.title}
          title={item.title}
          value={item.value}
          icon={item.icon}
          trend={item.trend}
          trendDirection={item.trendDirection}
          subtitle={item.subtitle}
          loading={loading}
        />
      ))}
    </div>
  );
}

function TransactionsTableWidget({
  rows,
  loading,
  role,
}: {
  rows: StatsResponse["recentTransactions"];
  loading: boolean;
  role: UserRole | null;
}) {
  const navigate = useNavigate();
  const showFullAmounts = role === "admin" || role === "account";
  const canViewTransactions =
    role === "admin" || role === "account" || role === "customer_support";

  if (!canViewTransactions) return null;

  return (
    <Card className="border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Recent Transactions
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Latest financial flows across the network
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/transactions")}
          className="h-8 rounded-xl text-xs font-semibold text-brand hover:text-brand"
        >
          View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                {showFullAmounts && <th className="py-3 px-4">Amount</th>}
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-4">
                      <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={showFullAmounts ? 5 : 4}
                    className="py-10 text-center text-xs text-muted-foreground"
                  >
                    No recent transactions recorded.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 5).map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-brand/5 transition-colors cursor-pointer"
                    onClick={() => navigate("/transactions")}
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium text-brand">
                      {t.reference}
                    </td>
                    <td className="py-3 px-4 capitalize text-xs font-medium">
                      {t.type}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    {showFullAmounts && (
                      <td className="py-3 px-4 font-semibold text-xs text-foreground">
                        {formatNgn(t.amount)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("en-NG", {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ContributionsChartWidget({
  rows,
  role,
}: {
  rows: StatsResponse["recentTransactions"];
  role: UserRole | null;
}) {
  const canViewChart = role === "admin" || role === "account";

  const series = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of rows) {
      if (t.type !== "contribution" || t.status !== "completed") continue;
      const d = new Date(t.createdAt);
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + t.amount);
    }
    const arr = [...map.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  }, [rows]);

  if (!canViewChart) return null;

  return (
    <Card className="border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Daily Contributions Trend
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Real-time deposit activity into savings circles
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg bg-card shadow-xs font-semibold">
            7 Days
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg text-muted-foreground">
            30 Days
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-[320px] w-full">
          {series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Insufficient deposit data for chart rendering.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#207EC4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#207EC4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="currentColor"
                  className="text-border/40"
                  strokeDasharray="4 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ stroke: "#207EC4", strokeDasharray: "2 2" }}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    color: "#fff",
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                    fontSize: "12px",
                  }}
                  formatter={(v: any) => [formatNgn(Number(v)), "Amount"]}
                  labelFormatter={(l) =>
                    new Date(l).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#207EC4"
                  fill="url(#brandGradient)"
                  strokeWidth={3}
                  name="Contributions"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryWidget({
  data,
  role,
}: {
  data: StatsResponse["stats"] | null;
  role: UserRole | null;
}) {
  const canViewFinancials = role === "admin" || role === "account";

  return (
    <Card className="border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-base font-semibold text-foreground">
          Platform Executive Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-xs font-medium">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
          <span className="text-muted-foreground">Total Contributions Count</span>
          <span className="font-bold text-foreground text-sm">
            {(data?.totalContributions ?? 0).toLocaleString()}
          </span>
        </div>

        {canViewFinancials && (
          <>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <span className="text-muted-foreground">Gross Transaction Volume</span>
              <span className="font-bold text-brand text-sm">
                {formatNgn(data?.totalTransactionValue ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <span className="text-muted-foreground">Net Platform Earnings</span>
              <span className="font-bold text-emerald-600 text-sm">
                {formatNgn(data?.platformRevenue ?? 0)}
              </span>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-muted-foreground">
          <span>Active Operations Status</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Optimal
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const token = useAuthToken();
  const role = useUserRole();
  const navigate = useNavigate();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canViewTransactions =
    role === "admin" || role === "account" || role === "customer_support";
  const canViewChart = role === "admin" || role === "account";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/dashboard" } });
      return;
    }

    let abort = new AbortController();
    setLoading(true);
    setErr(null);

    apiFetch(STATS_URL, {
      method: "GET",
      signal: abort.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Failed to load stats: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.message) msg = `Failed to load stats: ${j.message}`;
          } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: any) => setData(json.data || json))
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load stats");
      })
      .finally(() => setLoading(false));

    return () => {
      abort.abort();
    };
  }, [token, navigate]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Executive Dashboard"
          subtitle="Real-time system metrics, transaction volume, and operational breakdown."
          breadcrumbs={[{ label: "Dashboard" }]}
        />

        {err && (
          <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
            {err}
          </div>
        )}

        {/* Top KPIs Grid */}
        <KPIs data={data?.stats ?? null} role={role} loading={loading} />

        {/* Main Content Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {canViewTransactions ? (
            <>
              <div className="lg:col-span-2">
                <TransactionsTableWidget
                  rows={data?.recentTransactions ?? []}
                  loading={loading}
                  role={role}
                />
              </div>
              <div className="lg:col-span-1">
                <SummaryWidget data={data?.stats ?? null} role={role} />
              </div>
            </>
          ) : (
            <div className="lg:col-span-3 max-w-md">
              <SummaryWidget data={data?.stats ?? null} role={role} />
            </div>
          )}
        </div>

        {/* Chart Section */}
        {canViewChart && (
          <ContributionsChartWidget
            rows={data?.recentTransactions ?? []}
            role={role}
          />
        )}
      </div>
    </AdminLayout>
  );
}