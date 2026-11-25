import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Shield, ArrowLeft, Users2, Calendar, Clock, CreditCard } from "lucide-react";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

type Group = {
  _id: string;
  name: string;
  description?: string;
  admin?: { _id: string; email: string };
  members?: Array<{
    _id: string;
    user?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      image?: string;
    };
    role: string;
    joinedAt: string;
    isActive: boolean;
    status: string;
    payoutIndex: number;
  }>;
  savingsAmount: number;
  frequency: string;
  nextPayoutDate?: string;
  currentCycle?: number;
  payoutOrder: Array<{ _id: string; email: string } | string>;
  currentPayoutIndex?: number;
  status: string;
  maxMembers?: number;
  inviteCode?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  nextRecipient?: { _id: string; email: string } | string;
  id: string;
};

type Member = {
  _id: string;
  group: string;
  user: { _id: string; email: string } | string;
  isActive: boolean;
  status: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

type GroupShowResponse = {
  group: Group;
  members: Member[];
  contributions: any[];
  payouts: any[];
};

const BASE = API_BASE_URL;
const SHOW_URL = (id: string) => `${BASE}/group/all/${id}`;

function useToken() {
  return useMemo(() => {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.token as string | null;
    } catch {
      return null;
    }
  }, []);
}

function ngn(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₦${Math.round(n).toLocaleString()}`;
  }
}

function getFrequencyLabel(frequency: string) {
  if (!frequency) return "—";
  const freq = frequency.toLowerCase();
  const freqMap: Record<string, string> = {
    day: "Daily",
    daily: "Daily",
    week: "Weekly",
    weekly: "Weekly",
    month: "Monthly",
    monthly: "Monthly",
  };
  return freqMap[freq] || frequency;
}

export default function GroupDetails() {
  const { id = "" } = useParams();
  const token = useToken();
  const navigate = useNavigate();

  const [data, setData] = useState<GroupShowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true, state: { from: `/groups/${id}` } });
      return;
    }
    if (!id) {
      setErr("Missing group id");
      setLoading(false);
      return;
    }

    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    apiFetch(SHOW_URL(id), {
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load group: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = `Failed to load group: ${j.message}`;
          } catch {}
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => {
        if (j && j.success && j.data) {
          const groupData = j.data;
          setData({
            group: groupData,
            members: groupData.members || [],
            contributions: groupData.contributions || [],
            payouts: groupData.payouts || [],
          });
        } else {
          setData(j);
        }
      })
      .catch((e: any) => {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load group");
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, id, navigate]);

  const g = data?.group;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={g?.name || "Savings Circle"}
          subtitle="Inspect circle payout rotation, member status, and savings frequency."
          breadcrumbs={[
            { label: "Groups", href: "/groups" },
            { label: g?.name || "Group Details" },
          ]}
          rightSlot={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/groups")}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Groups
            </Button>
          }
        />

        {err && (
          <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
            {err}
          </div>
        )}

        {/* Executive Overview */}
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Circle Overview & Rotation Config
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 text-xs">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">
                Loading circle details...
              </div>
            ) : !g ? (
              <div className="py-8 text-center text-muted-foreground">
                Group details unavailable.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-4 grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Circle Name</span>
                    <p className="font-bold text-foreground text-sm">{g.name}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Admin / Lead</span>
                    <p className="font-mono text-foreground font-semibold truncate">
                      {g.admin?.email ||
                        g.members?.find((m) => m.role === "admin")?.user?.email ||
                        "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Contribution Amount</span>
                    <p className="font-bold text-brand text-sm">{ngn(g.savingsAmount)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Frequency</span>
                    <p className="font-semibold text-foreground">
                      {getFrequencyLabel(g.frequency)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Circle Status</span>
                    <div>
                      <StatusBadge status={g.status} />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Next Payout Date</span>
                    <p className="font-semibold text-foreground">
                      {g.nextPayoutDate
                        ? new Date(g.nextPayoutDate).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Invite Code</span>
                    <p className="font-mono text-foreground font-semibold">{g.inviteCode || "—"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Current Cycle</span>
                    <p className="font-bold text-foreground text-sm">{g.currentCycle ?? "1"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    Rotation Payout Order
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {g.payoutOrder?.map((p, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          i === g.currentPayoutIndex
                            ? "bg-brand text-white border-brand shadow-sm font-bold"
                            : "bg-card border-border text-foreground"
                        }`}
                      >
                        #{i + 1} {typeof p === "string" ? p : p.email}
                      </span>
                    ))}
                    {(!g.payoutOrder || g.payoutOrder.length === 0) && (
                      <span className="text-muted-foreground text-xs">
                        No payout order generated yet.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Roster */}
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users2 className="h-4 w-4 text-brand" /> Circle Members ({data?.members?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                Loading members...
              </div>
            ) : (data?.members?.length || 0) === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No active members in this circle.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left text-muted-foreground font-semibold uppercase">
                    <tr className="border-b border-border/60">
                      <th className="py-3 px-4">Member Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-foreground">
                    {data!.members.map((m) => (
                      <tr key={m._id} className="hover:bg-brand/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-brand">
                          {typeof m.user === "string" ? m.user : m.user.email}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={m.status || "active"} />
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(m.joinedAt).toLocaleDateString("en-NG", {
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
      </div>
    </AdminLayout>
  );
}
