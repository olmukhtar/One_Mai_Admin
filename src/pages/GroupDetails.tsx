import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Shield, ArrowLeft } from "lucide-react";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

type Group = {
  _id: string;
  name: string;
  description?: string;
  admin: { _id: string; email: string };
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
const SHOW_URL = (id: string) => `${BASE}/admin/groups/${id}`;

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
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `€${Math.round(n).toLocaleString()}`;
  }
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
          } catch { }
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: GroupShowResponse) => setData(j))
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
          title={g?.name || "Group"}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Groups", href: "/groups" },
            { label: g?.name || "Group" },
          ]}
          rightSlot={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          }
        />

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {err}
          </div>
        )}

        {/* Overview */}
        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            {loading ? (
              <div className="text-slate-500">Loading…</div>
            ) : !g ? (
              <div className="text-slate-500">Group not found.</div>
            ) : (
              <div className="grid md:grid-cols-4 grid-cols-2 gap-4 text-slate-800">
                <div>
                  <div className="text-slate-500">Name</div>
                  <div className="font-medium">{g.name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Admin</div>
                  <div className="font-mono text-xs">{g.admin?.email}</div>
                </div>
                <div>
                  <div className="text-slate-500">Savings Amount</div>
                  <div>{ngn(g.savingsAmount)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Frequency</div>
                  <div className="capitalize">{g.frequency}</div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div><StatusBadge status={g.status} /></div>
                </div>
                <div>
                  <div className="text-slate-500">Next Payout</div>
                  <div>
                    {g.nextPayoutDate
                      ? new Date(g.nextPayoutDate).toLocaleString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Invite Code</div>
                  <div className="font-mono text-xs">{g.inviteCode || "—"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Current Cycle</div>
                  <div>{g.currentCycle ?? "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500">Next Recipient</div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <span className="font-mono text-xs">
                      {typeof g.nextRecipient === "string"
                        ? g.nextRecipient
                        : g.nextRecipient?.email || "—"}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500">Payout Order</div>
                  <div className="flex flex-wrap gap-2">
                    {g.payoutOrder?.map((p, i) => (
                      <span
                        key={i}
                        className={
                          "px-2 py-1 rounded-full text-xs border " +
                          (i === g.currentPayoutIndex
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-700")
                        }
                      >
                        {typeof p === "string" ? p : p.email}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="text-slate-500 text-sm">Loading…</div>
            ) : (data?.members?.length || 0) === 0 ? (
              <div className="text-slate-500 text-sm">No members.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {data!.members.map((m) => (
                      <tr key={m._id} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {typeof m.user === "string" ? m.user : m.user.email}
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-2 pr-4">
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

        {/* Placeholders for future data */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border border-slate-100 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Contributions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm">
              {(data?.contributions?.length || 0) === 0 ? (
                <div className="text-slate-500">No contributions.</div>
              ) : (
                <div>Coming soon.</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-slate-100 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Payouts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm">
              {(data?.payouts?.length || 0) === 0 ? (
                <div className="text-slate-500">No payouts.</div>
              ) : (
                <div>Coming soon.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
