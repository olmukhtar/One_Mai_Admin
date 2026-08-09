import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, Users2, Calendar, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type GroupLite = {
  _id: string;
  name: string;
  description?: string;
  admin?: { _id: string; email: string };
  members?: Array<{
    _id: string;
    user?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      image?: string;
    };
    role: string;
    joinedAt: string;
    isActive: boolean;
    status: string;
    payoutIndex: number;
  }>;
  savingsAmount: number;
  frequency: "day" | "week" | "month" | string;
  nextPayoutDate?: string;
  currentCycle?: number;
  currentPayoutIndex?: number;
  status: string;
  maxMembers?: number;
  inviteCode?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  nextRecipient?: string;
  id: string;
};

type GroupsResponse = {
  groups: GroupLite[];
  currentPage: number;
  totalPages: number;
  totalGroups: number;
};

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

const GROUPS_URL = `${API_BASE_URL}/group/all`;

function useToken() {
  return useMemo(() => {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.token as string | null;
    } catch {
      return null;
    }
  }, []);
}

function ngn(n: number) {
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

function getFrequencyLabel(frequency: string) {
  if (!frequency) return "—";
  const freq = frequency.toLowerCase();
  const freqMap: Record<string, string> = {
    day: "Daily",
    daily: "Daily",
    week: "Weekly",
    weekly: "Weekly",
    month: "Monthly",
    monthly: "Monthly",
  };
  return freqMap[freq] || frequency;
}

export default function Groups() {
  const token = useToken();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [data, setData] = useState<GroupsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true, state: { from: "/groups" } });
      return;
    }

    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    const url = new URL(GROUPS_URL);
    url.searchParams.set("page", String(page));
    if (debouncedSearch) {
      url.searchParams.set("search", debouncedSearch);
    }
    if (statusFilter && statusFilter !== "all") {
      url.searchParams.set("status", statusFilter);
    }

    apiFetch(url.toString(), {
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load groups: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = `Failed to load groups: ${j.message}`;
          } catch {}
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => setData(j.data || j))
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load groups");
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, page, debouncedSearch, statusFilter, navigate]);

  const rows = data?.groups ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;
  const totalGroups = data?.totalGroups ?? 0;

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Circle Name",
        render: (_: any, row: GroupLite) => (
          <div className="flex flex-col">
            <Link
              to={`/groups/${row._id}`}
              className="font-bold text-foreground hover:text-brand transition-colors text-sm"
            >
              {row.name || "—"}
            </Link>
            <span className="text-xs text-muted-foreground font-mono">
              Code: {row.inviteCode || "N/A"}
            </span>
          </div>
        ),
      },
      {
        key: "admin",
        label: "Group Lead / Admin",
        render: (_: any, row: GroupLite) => (
          <span className="text-xs text-muted-foreground font-medium truncate max-w-[150px] inline-block">
            {row.admin?.email ||
              row.members?.find((m) => m.role === "admin")?.user?.email ||
              "—"}
          </span>
        ),
      },
      {
        key: "savingsAmount",
        label: "Savings Contribution",
        render: (v: number) => (
          <span className="font-bold text-xs text-foreground">{ngn(v)}</span>
        ),
      },
      {
        key: "frequency",
        label: "Schedule",
        render: (v: string) => (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
            <Clock className="h-3 w-3" /> {getFrequencyLabel(v)}
          </span>
        ),
      },
      {
        key: "nextPayoutDate",
        label: "Next Payout",
        render: (v: string) =>
          v ? (
            <span className="text-xs text-muted-foreground">
              {new Date(v).toLocaleDateString("en-NG", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "status",
        label: "Status",
        render: (v: string) => <StatusBadge status={v} />,
      },
    ],
    []
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Savings Circles"
          subtitle="Overview of group contribution pools, member rotations, and payout schedules."
          breadcrumbs={[{ label: "Groups" }]}
          rightSlot={
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 rounded-xl border-border/80 text-xs font-medium bg-card">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
          actionItems={[
            {
              label: "Inspect Circle Details",
              onClick: (row: GroupLite) => navigate(`/groups/${row._id}`),
            },
          ]}
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalGroups}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          searchPlaceholder="Search savings circles by name..."
          loading={loading}
        />
      </div>
    </AdminLayout>
  );
}