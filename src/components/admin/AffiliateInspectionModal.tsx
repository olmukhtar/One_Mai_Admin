import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable } from "@/components/admin/DataTable";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import {
  UsersRound,
  MessageSquare,
  MessageSquarePlus,
  UserCheck,
  Send,
  Loader2,
} from "lucide-react";

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

type ReferralRow = {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  joinedAt?: string;
  reward?: number;
};

type RemarkRow = {
  _id: string;
  remark: string;
  adminName: string;
  createdAt?: string;
};

interface AffiliateInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliate: {
    userId: string;
    name: string;
    email: string;
    referralCode?: string;
    image?: string;
  } | null;
}

const PAGE_SIZE = 10;
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

export function AffiliateInspectionModal({ open, onOpenChange, affiliate }: AffiliateInspectionModalProps) {
  const token = useToken();
  const role = useUserRole();
  const adminId = useAdminId();
  const { toast } = useToast();

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

  const canManageRemarks = role === "admin" || role === "account";

  const fetchDetails = async () => {
    if (!token || !affiliate?.userId) return;

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

  useEffect(() => {
    if (open && affiliate?.userId) {
      fetchDetails();
    }
  }, [open, affiliate?.userId, token]);

  const handleAddRemark = async () => {
    if (!affiliate || !adminId) {
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
          user: affiliate.userId,
          remark: remarkText.trim(),
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || `Failed to add remark: ${res.status}`);
      }

      toast({
        title: "Remark saved",
        description: body?.message || `Internal note added for ${affiliate.name}.`,
      });

      setRemarkText("");

      // Refetch remarks
      const remRes = await apiFetch(AFFILIATE_REMARKS_URL(affiliate.userId));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl bg-card p-6">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-brand/10">
              <AvatarImage src={affiliate?.image} alt={affiliate?.name} />
              <AvatarFallback className="bg-brand text-white font-bold text-xs">
                {initials(affiliate?.name || "Affiliate")}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {affiliate?.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">
                {affiliate?.email} · Ref Code:{" "}
                <span className="font-bold text-brand">{affiliate?.referralCode || "N/A"}</span>
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
  );
}
