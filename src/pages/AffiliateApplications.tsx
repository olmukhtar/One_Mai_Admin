import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, RefreshCw, AlertCircle, CheckCircle2, ClipboardCheck } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { AffiliateInspectionModal } from "@/components/admin/AffiliateInspectionModal";

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
  referrals?: any[];
};

type ListResponse = {
  success: boolean;
  message: string;
  data: Application[];
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const LIST_URL = `${API_BASE_URL}/admin/affiliate-applications`;
const LIMIT = 20;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "more_information", label: "More Info Requested" },
  { value: "interview", label: "Interview Scheduled" },
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



function nameOf(u?: ApplicationUser) {
  if (!u) return "—";
  return `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim() || u.email || "—";
}

function initials(name: string) {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function humanizeStatus(status: string) {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AffiliateApplications() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Affiliate inspection state
  const [inspectOpen, setInspectOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<{
    userId: string;
    name: string;
    email: string;
    referralCode?: string;
    image?: string;
  } | null>(null);

  const fetchApplications = () => {
    if (!token) return;

    setLoading(true);
    setErr(null);

    const url = new URL(LIST_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(LIMIT));
    if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

    apiFetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Failed to load partner applications: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.message) msg = `Failed to load partner applications: ${j.message}`;
          } catch { }
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: ListResponse) => {
        setRows(json.data || []);
      })
      .catch((e: any) => {
        setErr(e?.message || "Failed to load partner applications");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/affiliate-applications" } });
      return;
    }
    fetchApplications();
  }, [token, page, statusFilter]);

  const hasMore = rows.length >= LIMIT;
  const totalPages = hasMore ? page + 1 : page;

  const columns = [
    {
      key: "applicant",
      label: "Applicant Info",
      render: (_: any, row: Application) => {
        const u = row.user;
        const name = nameOf(u);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-brand/10">
              <AvatarImage src={u?.image} alt={name} />
              <AvatarFallback className="bg-brand/10 text-brand font-bold text-xs">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <Link
                to={`/users/${u?._id}`}
                className="font-semibold text-foreground hover:text-brand transition-colors text-sm"
              >
                {name}
              </Link>
              <span className="text-xs text-muted-foreground">{u?.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "promotionChannels",
      label: "Target Channels",
      render: (_: any, row: Application) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {(row.promotionChannels || []).map((c) => (
            <span
              key={c}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20"
            >
              {CHANNEL_LABELS[c] || c}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "hasAudience",
      label: "Audience Reach",
      render: (_: any, row: Application) => (
        <span className="text-xs font-semibold text-foreground">
          {row.hasAudience
            ? row.estimatedAudienceSize
              ? `${row.estimatedAudienceSize.toLocaleString()} followers`
              : "Yes"
            : "Direct Network"}
        </span>
      ),
    },
    {
      key: "totalReferrals",
      label: "Total Referrals",
      render: (_: any, row: Application) => {
        const referrals = row.referrals?.length ?? 0;
        return (
          <span className="font-semibold text-xs text-foreground">
            {referrals.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Review Status",
      render: (v: ApplicationStatus) => <StatusBadge status={humanizeStatus(v)} />,
    },
    {
      key: "createdAt",
      label: "Application Date",
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">
          {new Date(v).toLocaleDateString("en-NG", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Partner Application Pipeline"
          subtitle="Review candidate applications, inspect audience size metrics, and approve commission tiers."
          breadcrumbs={[{ label: "Partner Applications" }]}
          showExportButtons
          rightSlot={
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-40 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Applications</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchApplications}
                disabled={loading}
                className="h-9 gap-1.5 rounded-xl text-xs font-medium border-border/80"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
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
            {
              label: "Review Application",
              onClick: (row: Application) => navigate(`/affiliate-applications/${row._id}`),
            },
            {
              label: "Inspect Referrals & Remarks",
              onClick: (row: Application) => {
                setSelectedAffiliate({
                  userId: row.user._id,
                  name: nameOf(row.user),
                  email: row.user.email,
                  referralCode: row.user.referralCode,
                  image: row.user.image,
                });
                setInspectOpen(true);
              },
            },
          ]}
          currentPage={page}
          totalPages={totalPages}
          totalEntries={rows.length}
          onPageChange={setPage}
          loading={loading}
        />
      </div>

      <AffiliateInspectionModal
        open={inspectOpen}
        onOpenChange={setInspectOpen}
        affiliate={selectedAffiliate}
      />
    </AdminLayout>
  );
}
