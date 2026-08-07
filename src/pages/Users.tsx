import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, ShieldAlert, Mail, Phone, Calendar } from "lucide-react";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  image?: string;
  email: string;
  userType?: "normal" | "affiliate" | string;
  accountStatus?: "active" | "suspended" | string;
  authType?: string;
  twoFactor?: boolean;
  isVerified: boolean;
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
};

type UsersResponse = {
  users: User[];
  currentPage: number;
  totalPages: number;
  totalUsers: number;
};

type UserRole = "admin" | "account" | "frontDesk" | "customerSupport";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

const USERS_URL = `${API_BASE_URL}/admin/users`;

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
      return parsed?.role as UserRole | null;
    } catch {
      return null;
    }
  }, []);
}

function nameOf(u: User) {
  return `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim() || "—";
}

function initials(name: string) {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Users() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthToken();
  const userRole = useUserRole();

  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const [page, setPage] = useState(initialPage);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const hasFullAccess = userRole === "admin" || userRole === "account";
  const hasLimitedView = userRole === "frontDesk";
  const hasReadOnly = userRole === "customerSupport";
  const canViewDetails = hasFullAccess || hasLimitedView || hasReadOnly;
  const canSuspendUsers = hasFullAccess;

  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    const s = searchParams.get("search") || "";
    if (p !== page) setPage(p);
    if (s !== searchQuery) setSearchQuery(s);
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch !== currentSearch) {
      setSearchParams((prev) => {
        if (debouncedSearch) prev.set("search", debouncedSearch);
        else prev.delete("search");
        prev.set("page", "1");
        return prev;
      });
      if (page !== 1) setPage(1);
    }
  }, [debouncedSearch]);

  const fetchUsers = (pageNum: number, search?: string) => {
    if (!token) {
      setErr("Missing auth token. Sign in again.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setErr(null);

    const url = new URL(USERS_URL);
    url.searchParams.set("page", String(pageNum));
    url.searchParams.set("type", "normal");
    if (search) url.searchParams.set("search", search);

    apiFetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Failed to load users: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.message) msg = `Failed to load users: ${j.message}`;
          } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: any) => {
        const responseData = json.data || json;
        setData(responseData);
        setAllUsers(responseData.users || []);

        const actualPage = responseData.currentPage || pageNum;
        if (actualPage !== page) {
          setPage(actualPage);
          setSearchParams((prev) => {
            prev.set("page", String(actualPage));
            return prev;
          });
        }
      })
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load users");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  };

  useEffect(() => {
    fetchUsers(page, debouncedSearch);
  }, [token, page, debouncedSearch]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data?.totalPages || 1)) {
      setPage(newPage);
      setSearchParams((prev) => {
        prev.set("page", String(newPage));
        return prev;
      });
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "name",
        label: "User Information",
        render: (_: any, row: User) => {
          const name = nameOf(row);
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 ring-2 ring-brand/10">
                <AvatarImage src={row.image} alt={name} />
                <AvatarFallback className="bg-brand/10 text-brand font-bold text-xs">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                {canViewDetails ? (
                  <Link
                    to={`/users/${row._id}`}
                    state={{ from: location }}
                    className="font-semibold text-foreground hover:text-brand transition-colors text-sm"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground text-sm">{name}</span>
                )}
                <span className="text-xs text-muted-foreground">{row.email}</span>
              </div>
            </div>
          );
        },
      },
    ];

    if (hasLimitedView) {
      return [
        ...baseColumns,
        {
          key: "phoneNumber",
          label: "Phone",
          render: (v: string) => <span className="text-xs text-muted-foreground">{v || "—"}</span>,
        },
        {
          key: "accountStatus",
          label: "Status",
          render: (value: string) => <StatusBadge status={value || "active"} />,
        },
      ];
    }

    return [
      ...baseColumns,
      {
        key: "phoneNumber",
        label: "Phone",
        render: (v: string) => <span className="text-xs text-muted-foreground">{v || "—"}</span>,
      },
      {
        key: "accountStatus",
        label: "Account Status",
        render: (value: string) => <StatusBadge status={value || "active"} />,
      },
      {
        key: "isVerified",
        label: "KYC Verification",
        render: (v: boolean) => (
          <StatusBadge status={v ? "Verified" : "Unverified"} variant={v ? "success" : "warning"} />
        ),
      },
      {
        key: "createdAt",
        label: "Date Joined",
        render: (_: any, row: User) =>
          row.createdAt ? (
            <span className="text-xs text-muted-foreground">
              {new Date(row.createdAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </span>
          ) : (
            "—"
          ),
      },
    ];
  }, [hasLimitedView, canViewDetails, location]);

  const rows = allUsers.map((u) => ({
    ...u,
    name: nameOf(u),
    userType: u.userType || "normal",
  }));

  const actionItems = useMemo(() => {
    const actions = [];
    if (canViewDetails) {
      actions.push({
        label: "View Profile & Activity",
        onClick: (row: User) => navigate(`/users/${row._id}`, { state: { from: location } }),
      });
    }
    if (canSuspendUsers) {
      actions.push({
        label: "Toggle Account Status",
        onClick: (row: User) => console.log("Suspend user", row._id),
      });
    }
    return actions;
  }, [canViewDetails, canSuspendUsers, navigate, location]);

  const totalUsers = data?.totalUsers ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="User Directory"
          subtitle="Manage registered members, review KYC statuses, and inspect user activity profiles."
          breadcrumbs={[{ label: "Users" }]}
          showExportButtons
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
          totalEntries={totalUsers}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchPlaceholder="Search users by name, email, phone..."
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          bulkActions={[
            {
              label: "Export Selected",
              onClick: (selected) => console.log("Export selected", selected),
            },
            {
              label: "Suspend Selected",
              variant: "destructive",
              onClick: (selected) => console.log("Suspend selected", selected),
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
}