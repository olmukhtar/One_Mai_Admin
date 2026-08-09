import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  UsersRound,
  MessageSquarePlus,
  Send,
  UserCheck,
} from "lucide-react";

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
  phoneNumber: string;
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
  });
}

function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildName(input: any) {
  const name = [input?.firstName, input?.lastName].filter(Boolean).join(" ").trim();
  return name || input?.name || input?.email || "—";
}

function initials(name: string) {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
    phoneNumber: person?.phoneNumber || raw?.phoneNumber || "—",
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

  // Unified Inspection Modal State
  const [inspectOpen, setInspectOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateRow | null>(null);
  const [activeTab, setActiveTab] = useState<"referrals" | "remarks">("referrals");

  // Referrals Data inside Modal
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState<string | null>(null);

  // Remarks Data inside Modal
  const [remarks, setRemarks] = useState<RemarkRow[]>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarksError, setRemarksError] = useState<string | null>(null);

  // New Remark Form State
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

  const openInspectModal = async (affiliate: AffiliateRow, initialTab: "referrals" | "remarks" = "referrals") => {
    setSelectedAffiliate(affiliate);
    setActiveTab(initialTab);
    setInspectOpen(true);

    // Fetch Referrals
    setReferrals([]);
    setReferralsError(null);
    setReferralsLoading(true);

    // Fetch Remarks
    setRemarks([]);
    setRemarksError(null);
    setRemarksLoading(true);

    try {
      const refUrl = new URL(AFFILIATE_REFERRALS_URL(affiliate.userId));
      refUrl.searchParams.set("limit", String(PAGE_SIZE));
      refUrl.searchParams.set("page", "1");

      const refRes = await apiFetch(refUrl.toString());
      const refBody = await refRes.json().catch(() => null);

      if (refRes.ok) {
        setReferrals(unwrapArray(refBody, ["referrals", "users", "data"]).map(normalizeReferral));
      } else {
        setReferralsError(refBody?.message || "Failed to load affiliate referrals.");
      }
    } catch (error: any) {
      setReferralsError(error?.message || "Failed to load affiliate referrals.");
    } finally {
      setReferralsLoading(false);
    }

    try {
      const remRes = await apiFetch(AFFILIATE_REMARKS_URL(affiliate.userId));
      const remBody = await remRes.json().catch(() => null);

      if (remRes.ok) {
        setRemarks(unwrapArray(remBody, ["remarks", "data"]).map(normalizeRemark));
      } else {
        setRemarksError(remBody?.message || "Failed to load remarks.");
      }
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
        description: "Enter a remark note before submitting.",
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
        title: "Remark saved",
        description: body?.message || `Internal note added for ${selectedAffiliate.name}.`,
      });

      setRemarkText("");

      // Refetch remarks
      const remRes = await apiFetch(AFFILIATE_REMARKS_URL(selectedAffiliate.userId));
      const remBody = await remRes.json().catch(() => null);
      if (remRes.ok) {
        setRemarks(unwrapArray(remBody, ["remarks", "data"]).map(normalizeRemark));
      }
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
  }, [page, token, canView]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Affiliate Partner",
        render: (_: unknown, row: AffiliateRow) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-brand/10">
              <AvatarImage src={row.image} alt={row.name} />
              <AvatarFallback className="bg-brand/10 text-brand font-bold text-xs">
                {initials(row.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">{row.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{row.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: "accountStatus",
        label: "Status",
        render: (value: string) => <StatusBadge status={value} />,
      },
      {
        key: "totalReferrals",
        label: "Total Referrals",
        render: (value: number | undefined) => (
          <span className="font-bold text-xs text-foreground">{value ?? 0}</span>
        ),
      },
      {
        key: "payoutBalance",
        label: "Commission Balance",
        render: (value: number | undefined) => (
          <span className="font-bold text-xs text-brand">{formatMoney(value)}</span>
        ),
      },
      {
        key: "createdAt",
        label: "Joined Date",
        render: (value: string | undefined) => (
          <span className="text-xs text-muted-foreground">{formatDate(value)}</span>
        ),
      },
    ],
    []
  );

  const actionItems = useMemo(
    () => [
      {
        label: "Inspect Referrals & Remarks",
        onClick: (row: AffiliateRow) => openInspectModal(row, "referrals"),
      },
    ],
    []
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Affiliate Partners Directory"
          subtitle="Inspect partner referral counts, commission balance, and administrative remarks."
          breadcrumbs={[{ label: "Affiliates" }]}
          showExportButtons
          rightSlot={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAffiliates}
              disabled={loading}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Directory
            </Button>
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
          currentPage={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          onPageChange={setPage}
          loading={loading}
        />
      </div>

      {/* Unified Inspection Modal: Referrals List + Internal Admin Remarks */}
      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl bg-card p-6">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-brand/10">
                <AvatarImage src={selectedAffiliate?.image} alt={selectedAffiliate?.name} />
                <AvatarFallback className="bg-brand text-white font-bold text-xs">
                  {initials(selectedAffiliate?.name || "Affiliate")}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedAffiliate?.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedAffiliate?.email} · Ref Code:{" "}
                  <span className="font-bold text-brand">{selectedAffiliate?.referralCode || "N/A"}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Unified Tabs: Referrals & Internal Remarks */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "referrals" | "remarks")}
            className="w-full pt-2"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
              <TabsTrigger value="referrals" className="rounded-lg text-xs font-semibold">
                <UsersRound className="h-3.5 w-3.5 mr-1.5" /> Referrals List ({referrals.length})
              </TabsTrigger>
              <TabsTrigger value="remarks" className="rounded-lg text-xs font-semibold">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Internal Admin Remarks ({remarks.length})
              </TabsTrigger>
            </TabsList>

            {/* Referrals List Tab */}
            <TabsContent value="referrals" className="pt-4 space-y-4">
              {referralsLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                  Loading referral list...
                </div>
              ) : referralsError ? (
                <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  {referralsError}
                </div>
              ) : (
                <DataTable
                  columns={[
                    { key: "name", label: "Referred User" },
                    { key: "email", label: "Email" },
                    { key: "phoneNumber", label: "Phone Number" },
                    {
                      key: "status",
                      label: "Status",
                      render: (v: string) => <StatusBadge status={v} />,
                    },
                    {
                      key: "reward",
                      label: "Commission Earned",
                      render: (v: any) => (
                        <span className="font-bold text-brand">{formatMoney(Number(v) || 0)}</span>
                      ),
                    },
                  ]}
                  data={referrals}
                  showActions={false}
                />
              )}
            </TabsContent>

            {/* Internal Admin Remarks Tab */}
            <TabsContent value="remarks" className="pt-4 space-y-4">
              {/* Remarks List */}
              {remarksLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                  Loading internal remarks...
                </div>
              ) : remarksError ? (
                <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  {remarksError}
                </div>
              ) : remarks.length === 0 ? (
                <Card className="border border-dashed border-border/80 shadow-none rounded-2xl p-6 text-center bg-card">
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquarePlus className="h-8 w-8 text-muted-foreground/40" />
                    <span>No internal admin remarks saved for this affiliate partner yet.</span>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {remarks.map((r) => (
                    <div key={r._id} className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-brand flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5" /> {r.adminName}
                        </span>
                        <span className="text-muted-foreground text-[10px]">{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{r.remark}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Form to Add New Remark */}
              {canManageRemarks && (
                <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-foreground block">
                      Add New Admin Remark Note
                    </Label>
                    <Textarea
                      rows={3}
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Write an internal note about performance, compliance, or commissions..."
                      className="rounded-xl text-xs"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddRemark}
                        disabled={submittingRemark || !remarkText.trim()}
                        className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold gap-1.5"
                      >
                        {submittingRemark ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" /> Save Remark Note
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
