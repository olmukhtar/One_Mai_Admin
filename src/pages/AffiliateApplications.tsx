// src/pages/AffiliateApplications.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Still used for status filter
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldAlert,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

// --- Types ---

type Socials = {
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  facebook?: string;
  x?: string;
};

type ApplicationUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  email: string;
  userType?: string;
  accountStatus?: string;
  phoneNumber?: string;
  country?: string;
  currency?: string;
  isApproved?: boolean;
  achievementPoints?: number;
  streakCount?: number;
  identityNumber?: string;
  referralCode?: string;
  createdAt?: string;
  integrity?: number;
  restrictionMessage?: string;
};

type ApplicationStatus = "pending" | "approved" | "rejected" | "more_information" | "interview";

type Application = {
  _id: string;
  user: ApplicationUser;
  socials?: Socials;
  createdAt: string;
  updatedAt: string;
  estimatedAudienceSize?: number;
  hasAudience: boolean;
  hasProductPromotionExperience: boolean;
  promotionChannels: string[];
  reason: string;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  status: ApplicationStatus;
};

type KycRecord = {
  _id: string;
  type?: string;
  provider?: string;
  status?: string;
  submittedAt?: string;
  verifiedAt?: string;
  data?: {
    bvnInformationVerification?: {
      responseBody?: {
        name?: { matchStatus?: string; matchPercentage?: number };
        dateOfBirth?: string;
        mobileNo?: string;
      };
    };
    ninVerification?: {
      responseBody?: {
        firstName?: string;
        lastName?: string;
        middleName?: string;
        dateOfBirth?: string;
        gender?: string;
        mobileNumber?: string;
      };
    };
    summary?: { name?: string };
  };
};

type ListResponse = {
  success: boolean;
  message: string;
  data: Application[];
};

type DetailsResponse = {
  success: boolean;
  message: string;
  data: {
    application: Application;
    kyc?: KycRecord | null;
  };
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

// --- Constants & Helpers ---

const LIST_URL = `${API_BASE_URL}/admin/affiliate-applications`;
const DETAILS_URL = (id: string) => `${API_BASE_URL}/admin/affiliate-applications/${id}`;
const LIMIT = 20;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "more_information", label: "More Information Needed" },
  { value: "interview", label: "Interview" },
];

const CHANNEL_LABELS: Record<string, string> = {
  social_media: "Social Media",
  whatsapp: "WhatsApp",
  community: "Community",
  campus_ambassador: "Campus Ambassador",
  website_blog: "Website / Blog",
  business_network: "Business Network",
  other: "Other",
};

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

function useAdminId(): string | null {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.user?.id || parsed?.user?._id || null;
    } catch {
      return null;
    }
  }, []);
}

function nameOf(u?: ApplicationUser) {
  if (!u) return "—";
  return `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim() || u.email || "—";
}

function formatDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanizeStatus(status: string) {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AffiliateApplications() {
  const token = useToken();
  const role = useUserRole();
  const adminId = useAdminId();
  const navigate = useNavigate();

  const canView = role === "admin" || role === "account";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchApplications = () => {
    if (!token || !canView) return;

    setLoading(true);
    setErr(null);

    const url = new URL(LIST_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(LIMIT));
    if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

    apiFetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Failed to load affiliate applications: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.message) msg = `Failed to load affiliate applications: ${j.message}`;
          } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: ListResponse) => {
        setRows(json.data || []);
      })
      .catch((e: any) => {
        setErr(e?.message || "Failed to load affiliate applications");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/affiliate-applications" } });
      return;
    }
    if (!canView) {
      setErr("You don't have permission to view affiliate applications.");
      return;
    }
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, statusFilter, canView]);

  const openDetails = (id: string) => {
    navigate(`/affiliate-applications/${id}`);
  };

  if (!canView) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Affiliate Applications"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Affiliate Applications" }]}
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
                  You don't have permission to view affiliate applications. This feature is restricted to Admin and
                  Account roles.
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

  const hasMore = rows.length >= LIMIT;
  const totalPages = hasMore ? page + 1 : page;

  const columns = [
    {
      key: "applicant",
      label: "Applicant",
      render: (_: any, row: Application) => {
        const u = row.user;
        return (
          <div className="flex items-center gap-2">
            <img
              src={u?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameOf(u))}`}
              alt={nameOf(u)}
              className="h-8 w-8 rounded-full object-cover border border-slate-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <Link to={`/users/${u?._id}`} className="font-medium text-slate-900 hover:underline text-sm">
                {nameOf(u)}
              </Link>
              <span className="text-xs text-slate-500">{u?.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "promotionChannels",
      label: "Channels",
      render: (_: any, row: Application) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {(row.promotionChannels || []).map((c) => (
            <span
              key={c}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
            >
              {CHANNEL_LABELS[c] || c}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "hasAudience",
      label: "Audience",
      render: (_: any, row: Application) => (
        <span className="text-xs text-slate-700">
          {row.hasAudience ? (row.estimatedAudienceSize ? row.estimatedAudienceSize.toLocaleString() : "Yes") : "No"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: ApplicationStatus) => <StatusBadge status={humanizeStatus(v)} />,
    },
    {
      key: "createdAt",
      label: "Applied",
      render: (v: string) => <span className="text-xs text-slate-500">{formatDate(v)}</span>,
    },
  ];

  const actionItems = [{ label: "Review", onClick: (row: Application) => openDetails(row._id) }];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Affiliate Applications"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Affiliate Applications" }]}
            showSearch={false}
          />
          <Button
            onClick={fetchApplications}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2 border-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Status Filter:</span>
            <Select
              value={statusFilter}
              onValueChange={(v: any) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-56 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
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
            currentPage={page}
            totalPages={totalPages}
            totalEntries={rows.length}
            onPageChange={(newPage) => setPage(newPage)}
            loading={loading}
            searchPlaceholder="Filter current page..."
          />
        </div>

      </div>
    </AdminLayout>
  );
}
