import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Copy,
  Mail,
  Phone,
  Shield,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Building2,
  CreditCard,
  Users2,
  Award,
  Wallet,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Check,
  Activity,
  UserCheck,
} from "lucide-react";
import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  image?: string;
  email: string;
  userType: string;
  accountStatus: string;
  authType?: string;
  twoFactor?: boolean;
  isVerified: boolean;
  phoneNumber?: string;
  referralBonus?: number;
  payoutBalance?: number;
  referralCount?: number;
  createdAt?: string;
  updatedAt?: string;
  isApproved?: boolean;
  isAprroved?: boolean;
  affiliateTier?: string;
  commissionRate?: number;
  totalEarnings?: number;
  totalReferrals?: number;
  referralCode?: string;
};

type GroupMembership = {
  _id: string;
  group: {
    _id: string;
    name: string;
    savingsAmount: number;
    status: string;
    nextRecipient: string | null;
    id: string;
    frequency?: string;
  } | null;
  user: string;
  isActive: boolean;
  status: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

type BankDetail = {
  _id: string;
  user: string;
  bankName: string;
  accountHolderName: string;
  iban: string;
  bic: string;
  country: string;
  currency: string;
  stripeBankTokenId: string;
  isVerified: boolean;
  isDefault: boolean;
  verificationDocuments: any[];
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  user: User;
  groups: GroupMembership[];
  contributions: any[];
  payouts: any[];
  bankDetails: BankDetail[];
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const BASE_URL = API_BASE_URL;
const SHOW_URL = (id: string) => `${BASE_URL}/admin/users/${id}`;
const APPROVE_AFFILIATE_URL = (id: string) => `${BASE_URL}/user/${id}/approve-affiliate`;
const CHANGE_COMMISSION_URL = (id: string) => `${BASE_URL}/user/${id}/change-affiliate-commission`;

function fmtCurrency(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

function nameOf(u?: User) {
  if (!u) return "";
  const full = `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim();
  return full || u.email || "Member";
}

function initials(name: string) {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function UserDetails() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [percentage, setPercentage] = useState("10");
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState("10");
  const [updatingCommission, setUpdatingCommission] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);

  const token = useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token : null;
  }, []);

  const role = useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw)?.role as UserRole) : null;
  }, []);

  const canApproveAffiliate = role === "admin" || role === "account";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: `/users/${id}` } });
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    apiFetch(SHOW_URL(id), { method: "GET", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load user portfolio data");
        return res.json();
      })
      .then((json: any) => setData(json.data || json))
      .catch((e) => e.name !== "AbortError" && setErr(e.message))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, id, navigate]);

  const copyUserId = () => {
    if (!u?._id) return;
    navigator.clipboard.writeText(u._id);
    setCopiedId(true);
    toast({
      title: "Copied User ID",
      description: `User ID ${u._id} copied to clipboard.`,
    });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleApproveAffiliate = async () => {
    const pNum = parseFloat(percentage);
    if (isNaN(pNum) || pNum <= 0 || pNum > 100) return setApprovalError("Percentage must be between 1 and 100");

    setApproving(true);
    try {
      const res = await apiFetch(APPROVE_AFFILIATE_URL(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage }),
      });
      if (!res.ok) throw new Error("Partner approval failed");

      if (data) {
        setData({
          ...data,
          user: { ...data.user, isApproved: true, isAprroved: true, commissionRate: pNum },
        });
      }
      toast({
        title: "Partner Approved",
        description: `Member approved with a ${pNum}% commission rate.`,
      });
      setShowApprovalModal(false);
    } catch (e: any) {
      setApprovalError(e.message);
    } finally {
      setApproving(false);
    }
  };

  const handleChangeCommission = async () => {
    const pNum = parseFloat(newCommissionRate);
    if (isNaN(pNum) || pNum <= 0 || pNum > 100) return setCommissionError("Percentage must be between 1 and 100");

    setUpdatingCommission(true);
    try {
      const res = await apiFetch(CHANGE_COMMISSION_URL(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage: newCommissionRate }),
      });
      if (!res.ok) throw new Error("Failed to update commission rate");

      if (data) {
        setData({
          ...data,
          user: { ...data.user, commissionRate: pNum },
        });
      }
      toast({
        title: "Commission Rate Updated",
        description: `Commission updated to ${pNum}%.`,
      });
      setShowCommissionModal(false);
    } catch (e: any) {
      setCommissionError(e.message);
    } finally {
      setUpdatingCommission(false);
    }
  };

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="min-h-[450px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground text-xs">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <span>Fetching member portfolio...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const u = data?.user;
  const userName = nameOf(u);
  const isAffiliate = u?.userType === "affiliate";
  const isApprovedAffiliate = Boolean(u?.isApproved || u?.isAprroved);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={userName || "Member Portfolio"}
          subtitle="Detailed member identity, active ROSCA group memberships, and bank accounts."
          breadcrumbs={[
            { label: "Users Directory", href: "/users" },
            { label: userName || "User Details" },
          ]}
          rightSlot={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/users")}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold shadow-xs"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" /> Back to Directory
            </Button>
          }
        />

        {err && (
          <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200/60">
            {err}
          </div>
        )}

        {/* Hero Header Card */}
        <Card className="border border-border/80 shadow-md rounded-2xl bg-card overflow-hidden">
          <div className="bg-gradient-to-r from-brand/15 via-brand/5 to-transparent p-6 border-b border-border/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Identity Hero */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                  <AvatarImage
                    src={
                      u?.image
                        ? u.image.startsWith("http")
                          ? u.image
                          : `${IMAGE_BASE_URL}${u.image}`
                        : undefined
                    }
                  />
                  <AvatarFallback className="bg-brand text-white font-bold text-xl">
                    {initials(userName || "Member")}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">
                      {userName}
                    </h1>
                    <StatusBadge status={u?.accountStatus || "active"} />
                    {u?.isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Verified KYC
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20">
                        Unverified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                    <button
                      onClick={copyUserId}
                      className="inline-flex items-center gap-1 font-mono hover:text-brand transition-colors text-[11px] bg-muted/60 px-2 py-0.5 rounded-md border border-border/60"
                      title="Click to copy User ID"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>ID: {u?._id}</span>
                    </button>

                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-brand" /> Joined {formatDate(u?.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {u?.email && (
                  <a
                    href={`mailto:${u.email}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs"
                  >
                    <Mail className="h-3.5 w-3.5 text-brand" /> Send Email
                  </a>
                )}
                {u?.phoneNumber && (
                  <a
                    href={`tel:${u.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs"
                  >
                    <Phone className="h-3.5 w-3.5 text-brand" /> Call Member
                  </a>
                )}

                {isAffiliate && !isApprovedAffiliate && canApproveAffiliate && (
                  <Button
                    onClick={() => setShowApprovalModal(true)}
                    className="h-9 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md"
                  >
                    <Award className="h-3.5 w-3.5 mr-1.5" /> Approve Partner
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 bg-muted/20">
            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Active Circles
                </span>
                <span className="text-base font-extrabold text-foreground">
                  {data?.groups?.length || 0} Joined
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Bank Accounts
                </span>
                <span className="text-base font-extrabold text-foreground">
                  {data?.bankDetails?.length || 0} Linked
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Payout Balance
                </span>
                <span className="text-base font-extrabold text-brand">
                  {fmtCurrency(u?.payoutBalance || 0)}
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Member Type
                </span>
                <span className="text-base font-extrabold text-foreground capitalize">
                  {u?.userType || "Member"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Comprehensive Profile Cards */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-brand" /> Account Details
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Account Status</span>
                    <StatusBadge status={u?.accountStatus || "active"} />
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">KYC Verification</span>
                    <StatusBadge
                      status={u?.isVerified ? "Verified" : "Unverified"}
                      variant={u?.isVerified ? "success" : "warning"}
                    />
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Member Role</span>
                    <span className="capitalize font-bold text-foreground bg-brand/10 text-brand px-2.5 py-0.5 rounded-full">
                      {u?.userType || "Member"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">Auth Provider</span>
                    <span className="font-semibold text-foreground uppercase">{u?.authType || "Email/Password"}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground font-medium">2FA Security</span>
                    <span className="font-semibold text-foreground">
                      {u?.twoFactor ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Contact Channels
                  </span>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-foreground">
                    <Mail className="h-4 w-4 text-brand flex-shrink-0" />
                    <span className="truncate font-semibold font-mono text-[11px]">{u?.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-foreground">
                    <Phone className="h-4 w-4 text-brand flex-shrink-0" />
                    <span className="font-semibold font-mono text-[11px]">
                      {u?.phoneNumber || "No phone linked"}
                    </span>
                  </div>
                </div>

                {/* Affiliate Tier Box */}
                {isAffiliate && (
                  <div className="bg-brand/10 p-4 rounded-2xl border border-brand/20 space-y-3 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-brand uppercase tracking-wide flex items-center gap-1.5">
                        <Award className="h-4 w-4" /> Partner
                      </span>
                      <StatusBadge status={isApprovedAffiliate ? "Approved" : "Pending Approval"} />
                    </div>

                    {isApprovedAffiliate ? (
                      <div className="space-y-3 pt-2 border-t border-brand/20">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Commission Rate:</span>
                          <span className="font-bold text-brand text-sm">{u.commissionRate || 0}%</span>
                        </div>
                        {u.referralCode && (
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-muted-foreground font-sans">Ref Code:</span>
                            <span className="font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border/60">
                              {u.referralCode}
                            </span>
                          </div>
                        )}
                        {canApproveAffiliate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs rounded-xl border-brand/30 text-brand hover:bg-brand hover:text-white font-semibold"
                            onClick={() => {
                              setNewCommissionRate((u.commissionRate || 0).toString());
                              setCommissionError(null);
                              setShowCommissionModal(true);
                            }}
                          >
                            Modify Commission Rate
                          </Button>
                        )}
                      </div>
                    ) : (
                      canApproveAffiliate && (
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold shadow-xs"
                          onClick={() => setShowApprovalModal(true)}
                        >
                          Approve Partner Application
                        </Button>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Savings Circles, Banks & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* ROSCA Savings Circles Table */}
            <Card className="border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden">
              <CardHeader className="border-b border-border/60 pb-3 bg-muted/20">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-brand" /> Savings Circle Memberships
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground normal-case">
                    {data?.groups?.length || 0} active circles
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase border-b border-border/60">
                      <tr>
                        <th className="py-3 px-4">Circle Name</th>
                        <th className="py-3 px-4">Monthly Contribution</th>
                        <th className="py-3 px-4">Circle Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-foreground">
                      {data?.groups.map((g) => (
                        <tr key={g._id} className="hover:bg-brand/5 transition-colors">
                          <td className="py-3.5 px-4">
                            {g.group ? (
                              <Link
                                to={`/groups/${g.group._id}`}
                                className="font-bold text-brand hover:underline flex items-center gap-1.5 text-xs"
                              >
                                {g.group.name} <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground italic">Archived Circle</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            {fmtCurrency(g.group?.savingsAmount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={g.group?.status || "active"} />
                          </td>
                        </tr>
                      ))}

                      {(!data?.groups || data.groups.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Users2 className="h-8 w-8 text-muted-foreground/40" />
                              <span>No savings circles joined by this member yet.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Bank & Activity Information */}
            <Tabs defaultValue="bankDetails" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger value="bankDetails" className="rounded-lg text-xs font-semibold">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" /> Linked Bank Accounts
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg text-xs font-semibold">
                  <Activity className="h-3.5 w-3.5 mr-1.5" /> Recent Activity Log
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bankDetails" className="pt-4 space-y-4">
                {data?.bankDetails.map((bank) => (
                  <Card
                    key={bank._id}
                    className={`border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden border-l-4 ${
                      bank.isDefault ? "border-l-brand" : "border-l-slate-300"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-foreground">{bank.bankName}</h4>
                          <p className="text-xs text-muted-foreground font-medium">{bank.accountHolderName}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {bank.isDefault && <StatusBadge status="Default Account" variant="info" />}
                          <StatusBadge status={bank.isVerified ? "Verified Bank" : "Unverified"} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/40 p-3.5 rounded-xl border border-border/40">
                        <div>
                          <p className="text-muted-foreground text-[10px] uppercase font-bold">Account / IBAN</p>
                          <p className="font-mono text-foreground font-bold break-all">{bank.iban}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] uppercase font-bold">SWIFT / BIC</p>
                          <p className="font-mono text-foreground font-semibold">{bank.bic || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] uppercase font-bold">Country</p>
                          <p className="capitalize text-foreground font-semibold">{bank.country || "Nigeria"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] uppercase font-bold">Currency</p>
                          <p className="text-foreground font-bold text-brand">{bank.currency || "NGN"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!data?.bankDetails || data.bankDetails.length === 0) && (
                  <Card className="border border-dashed border-border/80 shadow-none rounded-2xl p-8 text-center bg-card">
                    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-8 w-8 text-muted-foreground/40" />
                      <span className="font-medium">No verified bank accounts linked to this account.</span>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="pt-4">
                <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-8 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 text-muted-foreground/40" />
                    <span>Member login sessions and administrative audit trails will render here.</span>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Affiliate Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full rounded-2xl border border-border shadow-2xl bg-card p-6">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base font-bold">Approve Partner Candidate</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Assign an initial referral commission percentage for {userName}.
              </p>
              <div className="space-y-1.5">
                <Label className="font-semibold">Commission Rate (%)</Label>
                <Input
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. 10"
                />
              </div>
              {approvalError && <p className="text-xs text-rose-600 font-medium">{approvalError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button variant="ghost" size="sm" onClick={() => setShowApprovalModal(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                  onClick={handleApproveAffiliate}
                  disabled={approving}
                >
                  {approving ? <Loader2 className="animate-spin h-4 w-4" /> : "Approve Candidate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Affiliate Commission Edit Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full rounded-2xl border border-border shadow-2xl bg-card p-6">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base font-bold">Modify Commission Rate</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-semibold">New Commission Percentage (%)</Label>
                <Input
                  type="number"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              {commissionError && <p className="text-xs text-rose-600 font-medium">{commissionError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button variant="ghost" size="sm" onClick={() => setShowCommissionModal(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                  onClick={handleChangeCommission}
                  disabled={updatingCommission}
                >
                  {updatingCommission ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Rate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}