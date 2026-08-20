import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AffiliatePicker } from "@/components/admin/AffiliatePicker";
import { Plus, X } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Campaign = {
  _id: string;
  name: string;
  code: string;
  affiliateId: string | { _id: string; firstName?: string; lastName?: string };
  couponAmount: number;
  maxSignups: number;
  usedSignups: number;
  status: "active" | "inactive" | "expired";
  startDate: string;
  endDate: string;
  createdAt: string;
};

const CAMPAIGNS_URL = `${API_BASE_URL}/campaigns`;

const emptyForm = {
  name: "",
  code: "",
  affiliateId: "",
  couponAmount: "",
  maxSignups: "",
  startDate: "",
  endDate: "",
};

const affiliateName = (a: Campaign["affiliateId"]) =>
  typeof a === "string" ? a : [a?.firstName, a?.lastName].filter(Boolean).join(" ") || a?._id || "—";

export default function Campaigns() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [affiliateLabel, setAffiliateLabel] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/campaigns" } });
      return;
    }
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate, page, statusFilter]);

  const fetchCampaigns = () => {
    const ctl = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);

    apiFetch(`${CAMPAIGNS_URL}?${params.toString()}`, { signal: ctl.signal })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load campaigns: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = j.message;
          } catch {}
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => {
        const d = j.data || {};
        setCampaigns(d.campaigns || []);
        setTotalPages(d.pages || 1);
        setTotalEntries(d.total ?? (d.campaigns || []).length);
      })
      .catch((e: any) => {
        if (e.name !== "AbortError") {
          toast({ title: "Error", description: e?.message || "Failed to load campaigns", variant: "destructive" });
        }
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setAffiliateLabel("");
    setFormError(null);
    setShowFormModal(true);
  };

  const openEdit = (row: Campaign) => {
    setEditingId(row._id);
    setForm({
      name: row.name,
      code: row.code,
      affiliateId: typeof row.affiliateId === "string" ? row.affiliateId : row.affiliateId?._id || "",
      couponAmount: String(row.couponAmount),
      maxSignups: String(row.maxSignups),
      startDate: row.startDate?.slice(0, 10) || "",
      endDate: row.endDate?.slice(0, 10) || "",
    });
    setAffiliateLabel(affiliateName(row.affiliateId));
    setFormError(null);
    setShowFormModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setAffiliateLabel("");
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.affiliateId.trim()) {
      setFormError("Name, code and affiliate ID are required");
      return;
    }
    const couponAmount = Number(form.couponAmount);
    const maxSignups = Number(form.maxSignups);
    if (!Number.isFinite(couponAmount) || couponAmount <= 0) {
      setFormError("Enter a valid coupon amount");
      return;
    }
    if (!Number.isFinite(maxSignups) || maxSignups <= 0) {
      setFormError("Enter a valid signup cap");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError("Start and end dates are required");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      affiliateId: form.affiliateId.trim(),
      couponAmount,
      maxSignups,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    try {
      const r = await apiFetch(editingId ? `${CAMPAIGNS_URL}/${editingId}` : CAMPAIGNS_URL, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Save failed");

      toast({ title: "Success", description: editingId ? "Campaign updated" : "Campaign created" });
      closeForm();
      fetchCampaigns();
    } catch (e: any) {
      setFormError(e?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (row: Campaign) => {
    const next = row.status === "active" ? "inactive" : "active";
    try {
      const r = await apiFetch(`${CAMPAIGNS_URL}/${row._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Status update failed");
      toast({ title: "Success", description: `Campaign marked ${next}` });
      fetchCampaigns();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Status update failed", variant: "destructive" });
    }
  };

  const handleDelete = async (row: Campaign) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setDeletingId(row._id);
    try {
      const r = await apiFetch(`${CAMPAIGNS_URL}/${row._id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Delete failed");
      toast({ title: "Success", description: "Campaign deleted" });
      fetchCampaigns();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Campaigns"
            subtitle="Affiliate coupon campaigns and signup incentives"
            breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Campaigns" }]}
            showSearch={false}
            showExportButtons={false}
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <DataTable
          loading={loading}
          data={campaigns}
          currentPage={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          onPageChange={setPage}
          columns={[
            { key: "name", label: "Name" },
            { key: "code", label: "Code" },
            {
              key: "affiliateId",
              label: "Affiliate",
              render: (v) => affiliateName(v),
            },
            {
              key: "couponAmount",
              label: "Coupon",
              render: (v) => `₦${Number(v).toLocaleString()}`,
            },
            {
              key: "usedSignups",
              label: "Signups",
              render: (v, row) => `${v} / ${row.maxSignups}`,
            },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusBadge status={v} />,
            },
            {
              key: "endDate",
              label: "Ends",
              render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
            },
          ]}
          actionItems={[
            { label: "Edit", onClick: openEdit },
            {
              label: "Toggle Active/Inactive",
              onClick: handleToggleStatus,
              show: (row) => row.status !== "expired",
            },
            {
              label: "Delete",
              onClick: handleDelete,
              disabled: (row) => deletingId === row._id,
            },
          ]}
        />

        {showFormModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-xl w-full rounded-2xl border border-border shadow-2xl bg-card p-6">
              <div className="flex justify-between items-center border-b border-border/60 pb-3">
                <h3 className="font-semibold text-base text-foreground">
                  {editingId ? "Edit Campaign" : "New Campaign"}
                </h3>
                <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 pt-4 text-xs">
                {formError && <p className="text-rose-600 font-medium">{formError}</p>}

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
                    placeholder="Davido Summer Promo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Code</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      disabled={!!editingId}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs disabled:opacity-60"
                      placeholder="DAVIDO2000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Affiliate</label>
                    <AffiliatePicker
                      value={form.affiliateId}
                      initialLabel={affiliateLabel}
                      onChange={(id, user) => {
                        setForm({ ...form, affiliateId: id });
                        setAffiliateLabel(user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "");
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Coupon Amount</label>
                    <input
                      type="number"
                      min="0"
                      value={form.couponAmount}
                      onChange={(e) => setForm({ ...form, couponAmount: e.target.value })}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
                      placeholder="2000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Max Signups</label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxSignups}
                      onChange={(e) => setForm({ ...form, maxSignups: e.target.value })}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
                      placeholder="500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-5">
                <Button variant="outline" onClick={closeForm} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Saving…" : editingId ? "Save Changes" : "Create Campaign"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
