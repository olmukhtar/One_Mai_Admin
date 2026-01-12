// /src/pages/admin/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, CreditCard, Users, Wallet, UserCheck } from "lucide-react";
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
    __v?: number;
  }>;
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";

const BASE_URL = "https://api.joinonemai.com/api";
const STATS_URL = `${BASE_URL}/admin/dashboard/stats`;

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

function formatEuro(n: number) {
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

function KPIs({ data, role }: { data: StatsResponse["stats"] | null; role: UserRole | null }) {
  const canSeeFinancials = role === "admin" || role === "account";
  const canSeePendingPayouts = role === "admin" || role === "account";

  const items = [
    {
      title: "Users",
      value: data ? data.totalUsers.toLocaleString() : "—",
      icon: Users,
      visible: true
    },
    {
      title: "Groups",
      value: data ? data.totalGroups.toLocaleString() : "—",
      icon: UserCheck,
      visible: true
    },
    {
      title: "Active Groups",
      value: data ? data.activeGroups.toLocaleString() : "—",
      icon: CreditCard,
      visible: true
    },
    {
      title: "Pending Payouts",
      value: data ? data.pendingPayoutRequests.toLocaleString() : "—",
      icon: Wallet,
      visible: canSeePendingPayouts
    },
    {
      title: "Txn Value",
      value: data ? formatEuro(data.totalTransactionValue) : "—",
      icon: ArrowUpRight,
      visible: canSeeFinancials
    },
    {
      title: "Revenue",
      value: data ? formatEuro(data.platformRevenue) : "—",
      icon: ArrowUpRight,
      visible: canSeeFinancials
    },
  ].filter(item => item.visible);

  // Dynamic grid based on number of visible items
  const gridCols = items.length <= 3
    ? "sm:grid-cols-2 lg:grid-cols-3"
    : items.length === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : items.length === 5
        ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {items.map(({ title, value, icon: Icon }) => (
        <Card key={title} className="border border-slate-100 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="text-slate-500 text-sm">{title}</div>
              <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-emerald-600 text-xs">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Live</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TransactionsTable({
  rows,
  loading,
  role,
}: {
  rows: StatsResponse["recentTransactions"];
  loading: boolean;
  role: UserRole | null;
}) {
  const showFullAmounts = role === "admin" || role === "account";
  const canViewTransactions = role === "admin" || role === "account" || role === "customer_support";

  if (!canViewTransactions) {
    return null;
  }

  return (
    <Card className="border border-slate-100 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                {showFullAmounts && <th className="py-2 pr-4">Amount</th>}
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={showFullAmounts ? 5 : 4} className="py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={showFullAmounts ? 5 : 4} className="py-6 text-center text-slate-500">
                    No transactions.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t._id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-mono text-xs">{t.reference}</td>
                    <td className="py-2 pr-4 capitalize">{t.type}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          "text-[11px] px-2 py-1 rounded-full " +
                          (t.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : t.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700")
                        }
                      >
                        {t.status}
                      </span>
                    </td>
                    {showFullAmounts && <td className="py-2 pr-4">{formatEuro(t.amount)}</td>}
                    <td className="py-2 pr-4">
                      {new Date(t.createdAt).toLocaleString("en-NG", {
                        year: "numeric",
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

function ContributionsChart({
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

  if (!canViewChart) {
    return null;
  }

  return (
    <Card className="border border-slate-100 shadow-sm rounded-xl">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-slate-900">
          Daily Contributions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6B7280", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(v).toLocaleString()}`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6B7280", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: "#CBD5E1" }}
                contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
                formatter={(v: any) => [formatEuro(Number(v)), "Amount"]}
                labelFormatter={(l) =>
                  new Date(l).toLocaleDateString("en-NG", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                fill="url(#fillBlue)"
                strokeWidth={2}
                name="Contributions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  data,
  role,
}: {
  data: StatsResponse["stats"] | null;
  role: UserRole | null;
}) {
  const canViewFinancials = role === "admin" || role === "account";

  if (!canViewFinancials) {
    return (
      <Card className="border border-slate-100 shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-slate-700 space-y-2">
          <div className="flex justify-between">
            <span>Total Users</span>
            <span>{(data?.totalUsers ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Groups</span>
            <span>{(data?.totalGroups ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Active Groups</span>
            <span>{(data?.activeGroups ?? 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-100 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-700 space-y-2">
        <div className="flex justify-between">
          <span>Total Contributions</span>
          <span>
            {(data?.totalContributions ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Total Transaction Value</span>
          <span>{formatEuro(data?.totalTransactionValue ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Platform Revenue</span>
          <span>{formatEuro(data?.platformRevenue ?? 0)}</span>
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

  // Determine layout based on role
  const canViewTransactions = role === "admin" || role === "account" || role === "customer_support";
  const canViewChart = role === "admin" || role === "account";
  const canViewFinancials = role === "admin" || role === "account";

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
          } catch { }
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: StatsResponse) => setData(json))
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
      <div className="space-y-6 bg-transparent">
        <PageHeader
          title="Dashboard"
          breadcrumbs={[{ label: "Dashboard" }]}
          showSearch={false}
          showExportButtons={false}
        />

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {err}
          </div>
        )}

        <KPIs data={data?.stats ?? null} role={role} />

        {/* Dynamic Layout Based on Visible Components */}
        {canViewTransactions ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Transactions table takes up 2 columns when visible */}
            <div className="lg:col-span-2">
              <TransactionsTable
                rows={data?.recentTransactions ?? []}
                loading={loading}
                role={role}
              />
            </div>
            {/* Summary card takes 1 column */}
            <div className="lg:col-span-1">
              <SummaryCard data={data?.stats ?? null} role={role} />
            </div>
          </div>
        ) : (
          // When transactions are hidden, summary takes full width
          <div className="max-w-md">
            <SummaryCard data={data?.stats ?? null} role={role} />
          </div>
        )}

        {/* Chart section - only shows for admin and account */}
        {canViewChart && (
          <ContributionsChart
            rows={data?.recentTransactions ?? []}
            role={role}
          />
        )}

        {/* Alternative content for Front Desk - show activity overview */}
        {role === "front_desk" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border border-slate-100 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">
                  User Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">
                  {(data?.stats.totalUsers ?? 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-500 mt-1">Total registered users</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Group Management
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">
                  {(data?.stats.totalGroups ?? 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-500 mt-1">Total groups created</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Active Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-900">
                  {(data?.stats.activeGroups ?? 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-500 mt-1">Currently active groups</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}