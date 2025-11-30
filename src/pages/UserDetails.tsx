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
  // Affiliate specific fields
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
  };
  user: string;
  isActive: boolean;
  status: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  user: User;
  groups: GroupMembership[];
  contributions: any[];
  payouts: any[];
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const AUTH_STORAGE_KEY = "admin_auth";
const BASE_URL = "https://api.joinonemai.com/api";
const SHOW_URL = (id: string) => `${BASE_URL}/admin/users/${id}`;
const APPROVE_AFFILIATE_URL = (id: string) => `${BASE_URL}/admin/users/${id}/approve-affiliate`;

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
      return (parsed?.role as UserRole) || null;
    } catch {
      return null;
    }
  }, []);
}

function fmtCurrency(n?: number) {
  if (!n) return "₦0";
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₦${Math.round(n).toLocaleString()}`;
  }
}

function nameOf(u?: User) {
  if (!u) return "";
  return `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim();
}

export default function UserDetails() {
  const { id = "" } = useParams();
  const token = useAuthToken();
  const role = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Affiliate approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [percentage, setPercentage] = useState("10");
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Permission check - only admin and account can approve affiliates
  const canApproveAffiliate = role === "admin" || role === "account";

  // Determine where we came from based on explicit state passed during navigation
  const fromPage = (location.state as any)?.fromPage;
  const cameFromAffiliates = fromPage === 'affiliates';
  
  // Also check if the user is an affiliate type to help determine context
  const isAffiliateUser = data?.user?.userType === "affiliate";

  // Determine breadcrumbs and back link based on context
  // Prioritize explicit fromPage state, then fall back to user type
  const userListLabel = cameFromAffiliates ? "Affiliates" : (isAffiliateUser ? "Affiliates" : "Users");
  const userListPath = cameFromAffiliates ? "/affiliates" : (isAffiliateUser ? "/affiliates" : "/users");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: `/users/${id}` } });
      return;
    }
    if (!id) {
      setErr("Missing user id");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setErr(null);

    fetch(SHOW_URL(id), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Failed to load user: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.message) msg = `Failed to load user: ${j.message}`;
          } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: ApiResponse) => setData(json))
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load user");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, id, navigate]);

  const handleApproveAffiliate = async () => {
    if (!token || !id) return;

    const percentageNum = parseFloat(percentage);
    if (isNaN(percentageNum) || percentageNum <= 0 || percentageNum > 100) {
      setApprovalError("Please enter a valid percentage between 1 and 100");
      return;
    }

    setApproving(true);
    setApprovalError(null);

    try {
      const response = await fetch(APPROVE_AFFILIATE_URL(id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ percentage }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to approve affiliate: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMsg = errorData.message;
        } catch {}
        throw new Error(errorMsg);
      }

      const result = await response.json();

      // Update local state
      if (data?.user) {
        setData({
          ...data,
          user: {
            ...data.user,
            isApproved: true,
            isAprroved: true,
            commissionRate: percentageNum,
          },
        });
      }

      setShowApprovalModal(false);
      setPercentage("10");
    } catch (error: any) {
      setApprovalError(error.message || "Failed to approve affiliate");
    } finally {
      setApproving(false);
    }
  };

  const u = data?.user;
  const isAffiliate = u?.userType === "affiliate";
  const isAffiliateApproved = u?.isApproved || u?.isAprroved; // Check both due to API typo

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={u ? nameOf(u) : "User"}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: userListLabel, href: userListPath },
            { label: u ? nameOf(u) : "User" },
          ]}
          rightSlot={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(userListPath)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {userListLabel}
              </Button>
              <Button variant="outline">Suspend</Button>
              <Button>Edit</Button>
            </div>
          }
        />

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {err}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Profile */}
          <Card className="lg:col-span-1 border border-slate-100 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="text-slate-500 text-sm">Loading…</div>
              ) : !u ? (
                <div className="text-slate-500 text-sm">No user found.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        u.image ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          nameOf(u) || u.email
                        )}`
                      }
                      alt={nameOf(u)}
                      className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                    <div>
                      <div className="text-lg font-semibold">{nameOf(u)}</div>
                      <div className="text-xs text-slate-500">{u._id}</div>
                    </div>
                  </div>

                  {/* Affiliate Approval Status - Show if user is affiliate */}
                  {isAffiliate && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-700">Affiliate Status</span>
                        {isAffiliateApproved ? (
                          <StatusBadge status="Approved" />
                        ) : (
                          <StatusBadge status="Pending Approval" />
                        )}
                      </div>
                      {isAffiliateApproved ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Commission Rate:</span>
                            <span className="font-semibold text-purple-700">{u.commissionRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Tier:</span>
                            <span className="font-semibold text-purple-700 capitalize">{u.affiliateTier || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Earnings:</span>
                            <span className="font-semibold text-purple-700">{fmtCurrency(u.totalEarnings)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Referrals:</span>
                            <span className="font-semibold text-purple-700">{u.totalReferrals || 0}</span>
                          </div>
                          {u.referralCode && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Referral Code:</span>
                              <span className="font-mono font-semibold text-purple-700">{u.referralCode}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        canApproveAffiliate && (
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
                            onClick={() => setShowApprovalModal(true)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Affiliate
                          </Button>
                        )
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Type</div>
                    <div><StatusBadge status={u.userType} /></div>

                    <div className="text-slate-500">Status</div>
                    <div><StatusBadge status={u.accountStatus} /></div>

                    <div className="text-slate-500">Verified</div>
                    <div><StatusBadge status={u.isVerified ? "Verified" : "Unverified"} /></div>

                    <div className="text-slate-500">2FA</div>
                    <div><StatusBadge status={u.twoFactor ? "On" : "Off"} /></div>

                    <div className="text-slate-500">Auth</div>
                    <div>{u.authType || "—"}</div>

                    <div className="text-slate-500">Joined</div>
                    <div>
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <a className="text-blue-600 hover:underline" href={`mailto:${u.email}`}>{u.email}</a>
                    <button
                      className="ml-auto p-1 rounded hover:bg-slate-100"
                      onClick={() => navigator.clipboard.writeText(u.email)}
                      title="Copy email"
                    >
                      <Copy className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>{u.phoneNumber || "—"}</span>
                    {u.phoneNumber && (
                      <a className="ml-auto text-blue-600 hover:underline" href={`tel:${u.phoneNumber}`}>
                        Call
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Referral Bonus</div>
                    <div>{fmtCurrency(u.referralBonus || 0)}</div>

                    <div className="text-slate-500">Payout Balance</div>
                    <div>{fmtCurrency(u.payoutBalance || 0)}</div>

                    <div className="text-slate-500">Referral Count</div>
                    <div>{u.referralCount ?? 0}</div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="h-3.5 w-3.5" />
                    Last update{" "}
                    {u.updatedAt
                      ? new Date(u.updatedAt).toLocaleString("en-NG", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="w-full">
                      <Link to={userListPath}>All {userListLabel}</Link>
                    </Button>
                    <Button variant="outline" className="w-full">
                      Message
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details + Related */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-slate-100 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Groups</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="text-sm text-slate-500">Loading…</div>
                ) : (data?.groups?.length || 0) === 0 ? (
                  <div className="text-sm text-slate-500">No groups.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-slate-500">
                        <tr className="border-b border-slate-100">
                          <th className="py-2 pr-4">Name</th>
                          <th className="py-2 pr-4">Savings Amount</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-800">
                        {data!.groups.map((g: GroupMembership) => (
                          <tr key={g._id} className="border-b border-slate-100">
                            <td className="py-2 pr-4">{g.group.name}</td>
                            <td className="py-2 pr-4">{fmtCurrency(g.group.savingsAmount)}</td>
                            <td className="py-2 pr-4"><StatusBadge status={g.group.status} /></td>
                            <td className="py-2 pr-4">
                              {new Date(g.joinedAt).toLocaleDateString("en-NG", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="contributions" className="w-full">
              <TabsList>
                <TabsTrigger value="contributions">Contributions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>

              <TabsContent value="contributions">
                <Card className="border border-slate-100 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Contributions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {(data?.contributions?.length || 0) === 0 ? (
                      <div className="text-sm text-slate-500">No contributions.</div>
                    ) : (
                      <div className="text-sm">Coming soon.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts">
                <Card className="border border-slate-100 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Payouts</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {(data?.payouts?.length || 0) === 0 ? (
                      <div className="text-sm text-slate-500">No payouts.</div>
                    ) : (
                      <div className="text-sm">Coming soon.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Affiliate Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Approve Affiliate
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Set the commission percentage for {nameOf(u)}. This will determine how much they earn from referrals.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="percentage">Commission Percentage (%)</Label>
                <Input
                  id="percentage"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="10"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter a percentage between 1 and 100
                </p>
              </div>

              {approvalError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                  {approvalError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalError(null);
                    setPercentage("10");
                  }}
                  disabled={approving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveAffiliate}
                  disabled={approving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {approving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Affiliate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}