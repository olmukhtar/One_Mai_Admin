import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

type GroupLite = {
  _id: string;
  name: string;
  description?: string;
  admin: { _id: string; email: string };
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

const BASE = "https://api.joinonemai.com/api";
const GROUPS_URL = `${BASE}/admin/groups`;

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
  const [date, setDate] = useState<DateRange | undefined>();

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
    if (date?.from) {
      url.searchParams.set("startDate", format(date.from, "yyyy-MM-dd"));
    }
    if (date?.to) {
      url.searchParams.set("endDate", format(date.to, "yyyy-MM-dd"));
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
          } catch { }
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: GroupsResponse) => setData(j))
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load groups");
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, page, debouncedSearch, statusFilter, date, navigate]);

  const rows = data?.groups ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;
  const totalGroups = data?.totalGroups ?? 0;

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Groups"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Groups" }]}
        />

        {/* Filters */}
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
        </div>

        {debouncedSearch && (
          <div className="text-sm text-slate-600">
            Found {totalGroups} groups
          </div>
        )}

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{err}</div>
        )}

        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">All Groups</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Admin</th>
                    <th className="py-2 pr-4">Savings Amount</th>
                    <th className="py-2 pr-4">Frequency</th>
                    <th className="py-2 pr-4">Next Payout</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Invite</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">Loading…</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
                        {debouncedSearch || statusFilter !== 'all' || date ? "No groups match your filters." : "No groups found."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((g) => (
                      <tr key={g._id} className="border-b border-slate-100">
                        <td className="py-2 pr-4">
                          <Link to={`/groups/${g._id}`} className="font-medium hover:underline">
                            {g.name || "—"}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{g.admin?.email || "—"}</td>
                        <td className="py-2 pr-4">{eur(g.savingsAmount)}</td>
                        <td className="py-2 pr-4 capitalize">{g.frequency}</td>
                        <td className="py-2 pr-4">
                          {g.nextPayoutDate
                            ? new Date(g.nextPayoutDate).toLocaleDateString("en-NG", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            })
                            : "—"}
                        </td>
                        <td className="py-2 pr-4"><StatusBadge status={g.status} /></td>
                        <td className="py-2 pr-4 font-mono text-xs">{g.inviteCode || "—"}</td>
                        <td className="py-2 pr-4">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/groups/${g._id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages} • {totalGroups} total
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                >
                  Previous
                </Button>

                {pageNumbers.map((pageNum, idx) => {
                  if (pageNum === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-3 py-1 text-slate-400">
                        ...
                      </span>
                    );
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum as number)}
                      disabled={loading}
                      className={pageNum === currentPage ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}