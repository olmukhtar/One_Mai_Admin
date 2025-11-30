// /src/pages/admin/Users.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  image?: string;
  email: string;
  userType: "normal" | "affiliate" | string;
  accountStatus: "active" | "suspended" | string;
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

const AUTH_STORAGE_KEY = "admin_auth";
const BASE_URL = "https://api.joinonemai.com/api";
const USERS_URL = `${BASE_URL}/admin/users`;

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

export default function Users() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const userRole = useUserRole();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // Check permissions
  const hasFullAccess = userRole === "admin" || userRole === "account";
  const hasLimitedView = userRole === "frontDesk";
  const hasReadOnly = userRole === "customerSupport";
  const canViewDetails = hasFullAccess || hasLimitedView || hasReadOnly;
  const canSuspendUsers = hasFullAccess;

  // Fetch users data
  const fetchUsers = (pageNum: number) => {
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

    fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
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
      .then((json: UsersResponse) => {
        setData(json);
        setAllUsers(json.users);
        setPage(json.currentPage || pageNum);
      })
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load users");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  };

  // Initial load
  useEffect(() => {
    fetchUsers(1);
  }, [token]);

  // Handle page change
  useEffect(() => {
    if (page !== 1) {
      fetchUsers(page);
    }
  }, [page]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset to first page when searching
    if (page !== 1) {
      setPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data?.totalPages || 1)) {
      setPage(newPage);
    }
  };

  // Real-time client-side filtering
  const filteredUsers = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return allUsers;
    
    return allUsers.filter((user) => {
      const name = nameOf(user).toLowerCase();
      const email = (user.email || "").toLowerCase();
      const phone = (user.phoneNumber || "").toLowerCase();
      const userType = (user.userType || "").toLowerCase();
      const status = (user.accountStatus || "").toLowerCase();
      
      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        userType.includes(query) ||
        status.includes(query)
      );
    });
  }, [allUsers, searchQuery]);

  // Build columns based on role permissions
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "name",
        label: "Name",
        render: (_: any, row: User) => (
          <div className="flex items-center gap-2">
            <img
              src={row.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameOf(row))}`}
              alt={nameOf(row)}
              className="h-8 w-8 rounded-full object-cover border border-slate-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="flex flex-col">
              {canViewDetails ? (
                <Link
                  to={`/users/${row._id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {nameOf(row)}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">{nameOf(row)}</span>
              )}
              <span className="text-xs text-slate-500">{row.phoneNumber || "—"}</span>
            </div>
          </div>
        ),
      },
    ];

    // Limited view for Front Desk - show only essential columns
    if (hasLimitedView) {
      return [
        ...baseColumns,
        { key: "email", label: "Email" },
        {
          key: "accountStatus",
          label: "Status",
          render: (value: string) => <StatusBadge status={value} />,
        },
      ];
    }

    // Read-only for Customer Support - show limited info
    if (hasReadOnly) {
      return [
        ...baseColumns,
        { key: "email", label: "Email" },
        {
          key: "userType",
          label: "Type",
          render: (value: string) => <StatusBadge status={value} />,
        },
        {
          key: "accountStatus",
          label: "Status",
          render: (value: string) => <StatusBadge status={value} />,
        },
      ];
    }

    // Full access for Admin and Account - show all columns
    return [
      ...baseColumns,
      { key: "email", label: "Email" },
      {
        key: "userType",
        label: "Type",
        render: (value: string) => <StatusBadge status={value} />,
      },
      {
        key: "accountStatus",
        label: "Status",
        render: (value: string) => <StatusBadge status={value} />,
      },
      {
        key: "isVerified",
        label: "Verified",
        render: (v: boolean) => <StatusBadge status={v ? "Verified" : "Unverified"} />,
      },
      {
        key: "createdAt",
        label: "Joined",
        render: (_: any, row: User) =>
          row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })
            : "—",
      },
    ];
  }, [hasFullAccess, hasLimitedView, hasReadOnly, canViewDetails]);

  const rows = filteredUsers.map((u) => ({
    ...u,
    name: nameOf(u),
  }));

  // Build action items based on role permissions
  const actionItems = useMemo(() => {
    const actions = [];

    // View Details - available to Admin, Account, Front Desk, and Customer Support
    if (canViewDetails) {
      actions.push({
        label: "View Details",
        onClick: (row: User) => navigate(`/users/${row._id}`),
      });
    }

    // Suspend - only available to Admin and Account
    if (canSuspendUsers) {
      actions.push({
        label: "Suspend",
        onClick: (row: User) => console.log("Suspend", row._id),
      });
    }

    return actions;
  }, [canViewDetails, canSuspendUsers, navigate]);

  const totalUsers = data?.totalUsers ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;

  // Show access denied message if user doesn't have permission
  if (!userRole || !canViewDetails) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Users — Normal"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}
          />
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded border border-red-100">
            You do not have permission to access this page.
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Users — Normal"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}
        />

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {err}
          </div>
        )}

        {/* Role indicator for limited access */}
        {(hasLimitedView || hasReadOnly) && (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
            {hasLimitedView && "Limited view mode - Some columns and actions are restricted."}
            {hasReadOnly && "Read-only mode - You can view user information but cannot make changes."}
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
          searchPlaceholder="Search users…"
          loading={loading}
          searchableFields={["name", "email", "phoneNumber", "userType", "accountStatus"]}
        />
      </div>
    </AdminLayout>
  );
}