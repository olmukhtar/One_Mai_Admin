import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Mail, Phone, Shield, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";

// --- Types ---

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
  isAprroved?: boolean; // Note: API has typo
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
  } | null; // Fix: Allow null for deleted or missing groups
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

// --- Constants & Helpers ---

const BASE_URL = "https://test.joinonemai.com/api";
const SHOW_URL = (id: string) => `${BASE_URL}/admin/users/${id}`;
const APPROVE_AFFILIATE_URL = (id: string) => `${BASE_URL}/admin/users/${id}/approve-affiliate`;

function fmtCurrency(n?: number) {
  if (!n && n !== 0) return "€0";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function nameOf(u?: User) {
  if (!u) return "";
  return `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim();
}

// --- Main Component ---

export default function UserDetails() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Affiliate state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [percentage, setPercentage] = useState("10");
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Auth & Roles
  const token = useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token : null;
  }, []);

  const role = useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw)?.role as UserRole) : null;
  }, []);

  const canApproveAffiliate = role === "admin" || role === "account";
  const cameFromAffiliates = (location.state as any)?.fromPage === 'affiliates';
  const userListPath = (cameFromAffiliates || data?.user?.userType === "affiliate") ? "/affiliates" : "/users";
  const userListLabel = (cameFromAffiliates || data?.user?.userType === "affiliate") ? "Affiliates" : "Users";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: `/users/${id}` } });
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    apiFetch(SHOW_URL(id), { method: "GET", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load user data");
        return res.json();
      })
      .then((json: ApiResponse) => setData(json))
      .catch((e) => e.name !== "AbortError" && setErr(e.message))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, id, navigate]);

  const handleApproveAffiliate = async () => {
    const pNum = parseFloat(percentage);
    if (isNaN(pNum) || pNum <= 0 || pNum > 100) return setApprovalError("Invalid percentage");

    setApproving(true);
    try {
      const res = await apiFetch(APPROVE_AFFILIATE_URL(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage }),
      });
      if (!res.ok) throw new Error("Approval failed");

      if (data) {
        setData({
          ...data,
          user: { ...data.user, isApproved: true, isAprroved: true, commissionRate: pNum }
        });
      }
      setShowApprovalModal(false);
    } catch (e: any) {
      setApprovalError(e.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  const u = data?.user;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={u ? nameOf(u) : "User Profile"}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: userListLabel, href: userListPath },
            { label: u ? nameOf(u) : "User" },
          ]}
          rightSlot={
            <Button variant="outline" onClick={() => navigate(userListPath)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Profile Card */}
          <Card className="lg:col-span-1 shadow-sm h-fit">
            <CardHeader><CardTitle className="text-base">Profile Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={u?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${u?.email}`}
                  className="h-16 w-16 rounded-full border"
                  alt="Avatar"
                />
                <div>
                  <h2 className="font-bold text-lg">{nameOf(u)}</h2>
                  <p className="text-xs text-slate-500 font-mono">{u?._id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 text-sm border-t pt-4">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={u?.accountStatus || "unknown"} />
                <span className="text-slate-500">Verification</span>
                <StatusBadge status={u?.isVerified ? "Verified" : "Unverified"} />
                <span className="text-slate-500">Type</span>
                <span className="capitalize font-medium">{u?.userType}</span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{u?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{u?.phoneNumber || "No phone"}</span>
                </div>
              </div>

              {u?.userType === "affiliate" && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-purple-700 uppercase">Affiliate</span>
                    <StatusBadge status={(u.isApproved || u.isAprroved) ? "Approved" : "Pending"} />
                  </div>
                  {!u.isApproved && !u.isAprroved && canApproveAffiliate && (
                    <Button size="sm" className="w-full bg-purple-600" onClick={() => setShowApprovalModal(true)}>
                      Approve Now
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Content Tabs */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">Savings Groups</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b text-slate-500">
                        <th className="pb-2 font-medium">Group Name</th>
                        <th className="pb-2 font-medium">Monthly</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.groups.map((g) => (
                        <tr key={g._id} className="border-b last:border-0">
                          {/* Fix: Optional chaining for group name */}
                          <td className="py-3 font-medium text-blue-600">
                            {g.group?.name || <span className="text-slate-400 italic">Unknown Group</span>}
                          </td>
                          <td className="py-3">{fmtCurrency(g.group?.savingsAmount)}</td>
                          <td className="py-3"><StatusBadge status={g.group?.status || "inactive"} /></td>
                        </tr>
                      ))}
                      {(!data?.groups || data.groups.length === 0) && (
                        <tr><td colSpan={3} className="py-4 text-center text-slate-500">No groups joined.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="bankDetails" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contributions">Contributions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="bankDetails">Bank Details</TabsTrigger>
              </TabsList>

              <TabsContent value="bankDetails" className="pt-4">
                <div className="grid gap-4">
                  {data?.bankDetails.map((bank) => (
                    <Card key={bank._id} className={`border-l-4 ${bank.isDefault ? 'border-l-blue-500' : 'border-l-slate-300'}`}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-lg">{bank.bankName}</h4>
                            <p className="text-sm text-slate-600">{bank.accountHolderName}</p>
                          </div>
                          <div className="flex gap-2">
                            {bank.isDefault && <StatusBadge status="Default" />}
                            <StatusBadge status={bank.isVerified ? "Verified" : "Unverified"} />
                          </div>
                        </div>

                        {/* Fix: Rendering all fields from JSON */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-md">
                          <div>
                            <p className="text-slate-500 text-xs uppercase font-bold mb-1">IBAN</p>
                            <p className="font-mono break-all">{bank.iban}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase font-bold mb-1">BIC/SWIFT</p>
                            <p className="font-mono">{bank.bic}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase font-bold mb-1">Country</p>
                            <p className="capitalize">{bank.country}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase font-bold mb-1">Currency</p>
                            <p>{bank.currency}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!data?.bankDetails || data.bankDetails.length === 0) && (
                    <div className="text-center py-12 border rounded-lg border-dashed text-slate-500">
                      No bank accounts registered.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Affiliate Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader><CardTitle>Approve Affiliate</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
              </div>
              {approvalError && <p className="text-red-500 text-sm">{approvalError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowApprovalModal(false)}>Cancel</Button>
                <Button className="bg-purple-600" onClick={handleApproveAffiliate} disabled={approving}>
                  {approving ? <Loader2 className="animate-spin h-4 w-4" /> : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}