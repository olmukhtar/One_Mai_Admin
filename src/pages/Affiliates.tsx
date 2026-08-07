import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, MessageSquarePlus, RefreshCw, UsersRound } from "lucide-react";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

type AffiliateRow = {
  _id: string;
  affiliateId: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  accountStatus: string;
  isVerified: boolean;
  image?: string;
  createdAt?: string;
  totalReferrals?: number;
  commissionRate?: number;
  payoutBalance?: number;
  referralCode?: string;
};

type ReferralRow = {
  _id: string;
  name: string;
  email: string;
  status: string;
  joinedAt?: string;
  reward?: number | string;
};

type RemarkRow = {
  _id: string;
  remark: string;
  adminName: string;
  createdAt?: string;
};

const PAGE_SIZE = 10;
const AFFILIATES_URL = `${API_BASE_URL}/admin/affiliate/all`;
const AFFILIATE_REFERRALS_URL = (userId: string) =>
  `${API_BASE_URL}/admin/affiliate/${userId}/referrals`;
const AFFILIATE_REMARKS_URL = (userId: string) =>
  `${API_BASE_URL}/admin/affiliate/remark/${userId}`;
const ADD_AFFILIATE_REMARK_URL = `${API_BASE_URL}/admin/affiliate/remark/add`;

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
      return JSON.parse(raw)?.role as UserRole | null;
    } catch {
      return null;
    }
  }, []);
}

function useAdminId() {
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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildName(input: any) {
  const name = [input?.firstName, input?.lastName].filter(Boolean).join(" ").trim();
  return name || input?.name || input?.email || "—";
}

function unwrapArray(payload: any, preferredKeys: string[]) {
  if (Array.isArray(payload)) return payload;
  for (const key of preferredKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeAffiliate(raw: any): AffiliateRow {
  const user = raw?.user || raw;
  const userId = user?._id || user?.id || raw?.userId || raw?.user || raw?._id || "";
  const affiliateId = raw?._id || raw?.affiliateId || userId;

  return {
    _id: affiliateId,
    affiliateId,
    userId,
    name: buildName(user),
    email: user?.email || raw?.email || "—",
    phoneNumber: user?.phoneNumber || raw?.phoneNumber || "—",
    accountStatus: user?.accountStatus || raw?.status || raw?.accountStatus || "unknown",
    isVerified: Boolean(user?.isVerified ?? raw?.isVerified),
    image: user?.image || raw?.image,
    createdAt: user?.createdAt || raw?.createdAt,
    totalReferrals:
      raw?.totalReferrals ?? raw?.referralsCount ?? user?.totalReferrals ?? raw?.referrals?.length,
    commissionRate: raw?.commissionRate ?? user?.commissionRate,
    payoutBalance: raw?.payoutBalance ?? user?.payoutBalance,
    referralCode: raw?.referralCode ?? user?.referralCode,
  };
}

function normalizeReferral(raw: any): ReferralRow {
  const person = raw?.referee || raw?.referredUser || raw?.referralUser || raw?.user || raw;
  const commissions = Array.isArray(raw?.commissions) ? raw.commissions : [];
  const rewardTotal = commissions.reduce((sum: number, item: any) => {
    const value =
      item?.amount ??
      item?.commission ??
      item?.reward ??
      item?.value ??
      0;
    return sum + (typeof value === "number" ? value : Number(value) || 0);
  }, 0);

  return {
    _id: raw?._id || person?._id || person?.id || crypto.randomUUID(),
    name: buildName(person),
    email: person?.email || raw?.email || "—",
    status: person?.accountStatus || raw?.status || raw?.state || "unknown",
    joinedAt: person?.createdAt || raw?.createdAt || raw?.joinedAt,
    reward:
      raw?.reward ??
      raw?.bonus ??
      raw?.commission ??
      raw?.amount ??
      (rewardTotal > 0 ? rewardTotal : 0),
  };
}

function normalizeRemark(raw: any): RemarkRow {
  const admin = raw?.admin || raw?.createdBy || raw?.author || {};
  return {
    _id: raw?._id || raw?.id || crypto.randomUUID(),
    remark: raw?.remark || raw?.message || raw?.note || "—",
    adminName: buildName(admin),
    createdAt: raw?.createdAt || raw?.updatedAt,
  };
}

export default function Affiliates() {
  const token = useToken();
  const role = useUserRole();
  const adminId = useAdminId();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateRow | null>(null);

  const [referralsOpen, setReferralsOpen] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState<string | null>(null);

  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarks, setRemarks] = useState<RemarkRow[]>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarksError, setRemarksError] = useState<string | null>(null);

  const [addRemarkOpen, setAddRemarkOpen] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);

  const canView = role === "admin" || role === "account" || role === "front_desk" || role === "customer_support";
  const canManageRemarks = role === "admin" || role === "account";

  const fetchAffiliates = async () => {
    if (!token || !canView) return;

    setLoading(true);
    setErr(null);

    try {
      const url = new URL(AFFILIATES_URL);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("page", String(page));

      const res = await apiFetch(url.toString());
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || `Failed to load affiliates: ${res.status}`);
      }

      const list = unwrapArray(body, ["affiliates", "users", "data"]).map(normalizeAffiliate);
      const meta = body?.data || body || {};

      setRows(list);
      setTotalEntries(meta?.total ?? meta?.totalAffiliates ?? meta?.count ?? list.length);
      setTotalPages(meta?.totalPages ?? Math.max(1, Math.ceil((meta?.total ?? list.length) / PAGE_SIZE)));
    } catch (error: any) {
      setErr(error?.message || "Failed to load affiliates.");
      setRows([]);
      setTotalEntries(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async (affiliate: AffiliateRow) => {
    setSelectedAffiliate(affiliate);
    setReferralsOpen(true);
    setReferrals([]);
    setReferralsError(null);
    setReferralsLoading(true);

    try {
      const url = new URL(AFFILIATE_REFERRALS_URL(affiliate.userId));
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("page", "1");

      const res = await apiFetch(url.toString());
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || `Failed to load referrals: ${res.status}`);
      }

      setReferrals(unwrapArray(body, ["referrals", "users", "data"]).map(normalizeReferral));
    } catch (error: any) {
      setReferralsError(error?.message || "Failed to load affiliate referrals.");
    } finally {
      setReferralsLoading(false);
    }
  };

  const fetchRemarks = async (affiliate: AffiliateRow) => {
    setSelectedAffiliate(affiliate);
    setRemarksOpen(true);
    setRemarks([]);
    setRemarksError(null);
    setRemarksLoading(true);

    try {
      const res = await apiFetch(AFFILIATE_REMARKS_URL(affiliate.userId));
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || `Failed to load remarks: ${res.status}`);
      }

      setRemarks(unwrapArray(body, ["remarks", "data"]).map(normalizeRemark));
    } catch (error: any) {
      setRemarksError(error?.message || "Failed to load remarks.");
    } finally {
      setRemarksLoading(false);
    }
  };

  const handleAddRemark = async () => {
    if (!selectedAffiliate || !adminId) {
      toast({
        title: "Unable to add remark",
        description: "Your admin account could not be identified. Please sign in again.",
        variant: "destructive",
      });
      return;
    }

    if (!remarkText.trim()) {
      toast({
        title: "Remark required",
        description: "Enter a remark before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingRemark(true);

    try {
      const res = await apiFetch(ADD_AFFILIATE_REMARK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin: adminId,
          user: selectedAffiliate.userId,
          remark: remarkText.trim(),
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || `Failed to add remark: ${res.status}`);
      }

      toast({
        title: "Remark added",
        description: body?.message || `Remark saved for ${selectedAffiliate.name}.`,
      });

      setAddRemarkOpen(false);
      setRemarkText("");
      await fetchRemarks(selectedAffiliate);
    } catch (error: any) {
      toast({
        title: "Failed to add remark",
        description: error?.message || "The remark could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRemark(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token, canView]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Affiliate",
        render: (_: unknown, row: AffiliateRow) => (
          <div className="flex items-center gap-3">
            <img
              src={row.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`}
              alt={row.name}
              className="h-9 w-9 rounded-full border border-slate-200 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{row.name}</div>
              <div className="text-xs text-slate-500">{row.phoneNumber}</div>
            </div>
          </div>
        ),
      },
      { key: "email", label: "Email" },
      {
        key: "accountStatus",
        label: "Status",
        render: (value: string, row: AffiliateRow) => (
          <div className="space-y-1">
            <StatusBadge status={value} />
            <div className="text-xs text-slate-500">{row.isVerified ? "Verified" : "Unverified"}</div>
          </div>
        ),
      },
      {
        key: "totalReferrals",
        label: "Referrals",
        render: (value: number | undefined) => value ?? "—",
      },
      {
        key: "payoutBalance",
        label: "Payout Balance",
        render: (value: number | undefined) => formatMoney(value),
      },
      {
        key: "createdAt",
        label: "Joined",
        render: (value: string | undefined) => formatDate(value),
      },
    ],
    []
  );

  const actionItems = useMemo(
    () => [
      {
        label: "View Referrals",
        onClick: (row: AffiliateRow) => fetchReferrals(row),
      },
      {
        label: "View Remarks",
        onClick: (row: AffiliateRow) => fetchRemarks(row),
      },
      {
        label: "Add Remark",
        onClick: (row: AffiliateRow) => {
          setSelectedAffiliate(row);
          setRemarkText("");
          setAddRemarkOpen(true);
        },
        show: () => canManageRemarks,
      },
    ],
    [canManageRemarks]
  );

  if (!canView) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Affiliates"
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Affiliates" }]}
          />
          <div className="rounded border border-red-100 bg-red-50 p-4 text-sm text-red-600">
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
          title="Affiliates"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Affiliates" }]}
          rightSlot={
            <Button variant="outline" onClick={fetchAffiliates} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        {err && (
          <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <DataTable
          columns={columns}
          data={rows}
          actionItems={actionItems}
          currentPage={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          onPageChange={setPage}
          searchPlaceholder="Search affiliates on this page..."
          loading={loading}
          searchableFields={["name", "email", "phoneNumber", "accountStatus", "referralCode"]}
        />
      </div>

      <Dialog open={referralsOpen} onOpenChange={setReferralsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedAffiliate?.name || "Affiliate"} Referrals</DialogTitle>
            <DialogDescription>
              Referral activity pulled from the admin affiliate referrals endpoint.
            </DialogDescription>
          </DialogHeader>

          {referralsLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : referralsError ? (
            <div className="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-600">{referralsError}</div>
          ) : referrals.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <UsersRound className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900">No referrals found</p>
                  <p className="text-sm text-slate-500">This affiliate does not have referral records yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={[
                { key: "name", label: "User" },
                { key: "email", label: "Email" },
                {
                  key: "status",
                  label: "Status",
                  render: (value: string) => <StatusBadge status={value} />,
                },
                {
                  key: "reward",
                  label: "Reward",
                  render: (value: number | string | undefined) =>
                    typeof value === "number" ? formatMoney(value) : value || "—",
                },
                {
                  key: "joinedAt",
                  label: "Joined",
                  render: (value: string | undefined) => formatDate(value),
                },
              ]}
              data={referrals}
              showActions={false}
              totalEntries={referrals.length}
              totalPages={1}
              currentPage={1}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={remarksOpen} onOpenChange={setRemarksOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAffiliate?.name || "Affiliate"} Remarks</DialogTitle>
            <DialogDescription>Internal notes from the admin remarks endpoint.</DialogDescription>
          </DialogHeader>

          {remarksLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : remarksError ? (
            <div className="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-600">{remarksError}</div>
          ) : remarks.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <MessageSquarePlus className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900">No remarks yet</p>
                  <p className="text-sm text-slate-500">There are no internal remarks saved for this affiliate.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {remarks.map((remark) => (
                <Card key={remark._id} className="border border-slate-200">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-slate-900">{remark.adminName}</div>
                      <div className="text-xs text-slate-500">{formatDate(remark.createdAt)}</div>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{remark.remark}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addRemarkOpen} onOpenChange={setAddRemarkOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Affiliate Remark</DialogTitle>
            <DialogDescription>
              This submits to `/api/admin/affiliate/remark/add` for {selectedAffiliate?.name || "the selected affiliate"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="affiliate-name">Affiliate</Label>
              <Input id="affiliate-name" value={selectedAffiliate?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark-text">Remark</Label>
              <Textarea
                id="remark-text"
                rows={5}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Write an internal note about this affiliate..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRemarkOpen(false)} disabled={submittingRemark}>
              Cancel
            </Button>
            <Button onClick={handleAddRemark} disabled={submittingRemark || !canManageRemarks}>
              {submittingRemark ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Remark"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
