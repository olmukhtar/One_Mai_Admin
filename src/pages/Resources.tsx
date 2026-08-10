import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, X, Plus, Loader2, Upload, Trash2, Eye, FileText, Download } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

type Resource = {
  _id: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  visibility: string;
  thumbnail?: string;
  file?: string;
  metrics: {
    downloads: number;
    views: number;
    shares: number;
  };
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ResourcesResponse = {
  resources: Resource[];
  message: string;
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const BASE = API_BASE_URL;
const RESOURCES_URL = `${BASE}/resource`;
const ADD_RESOURCE_URL = `${BASE}/resource`;
const DELETE_RESOURCE_URL = `${BASE}/resource`;
const UPDATE_RESOURCE_URL = `${BASE}/resource`;

export default function Resources() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "video",
    tags: "",
    visibility: "public",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [resourceFile, setResourceFile] = useState<File | string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/resources" } });
      return;
    }

    fetchResources();
  }, [token, navigate]);

  const fetchResources = () => {
    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    apiFetch(RESOURCES_URL, {
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load resources: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = `Failed to load resources: ${j.message}`;
          } catch {}
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => setData(j.data || j))
      .catch((e: any) => {
        if (e.name !== "AbortError") {
          setErr(e?.message || "Failed to load resources");
        }
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  };

  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource);
    setShowViewModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowViewModal(false);
    setSelectedResource(null);
    setFormData({
      title: "",
      description: "",
      type: "video",
      tags: "",
      visibility: "public",
    });
    setThumbnailFile(null);
    setResourceFile(null);
    setFormError(null);
  };

  const handleAddResource = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setFormError("Title and description are required");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("type", formData.type);
      formDataToSend.append("visibility", formData.visibility);

      const tagsArray = formData.tags.split(",").map((t) => t.trim()).filter(Boolean);
      tagsArray.forEach((tag) => formDataToSend.append("tags[]", tag));

      if (thumbnailFile) {
        formDataToSend.append("thumbnail", thumbnailFile);
      }
      if (resourceFile) {
        if (typeof resourceFile === "string") {
          formDataToSend.append("link", resourceFile);
        } else {
          formDataToSend.append("file", resourceFile);
        }
      }

      const response = await apiFetch(ADD_RESOURCE_URL, {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        let errorMsg = `Failed to add resource: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMsg = errorData.message;
        } catch {}
        throw new Error(errorMsg);
      }

      await fetchResources();
      handleCloseModals();
    } catch (error: any) {
      setFormError(error.message || "Failed to add resource");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await apiFetch(`${DELETE_RESOURCE_URL}/${resourceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete resource");

      await fetchResources();
      if (selectedResource?._id === resourceId) {
        handleCloseModals();
      }
    } catch (error) {
      setErr("Failed to delete resource");
    }
  };

  const filteredResources = useMemo(() => {
    if (!data?.resources) return [];
    let filtered = [...data.resources];

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (resource) => resource.type.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    if (visibilityFilter !== "all") {
      filtered = filtered.filter(
        (resource) => resource.visibility.toLowerCase() === visibilityFilter.toLowerCase()
      );
    }

    return filtered;
  }, [data, typeFilter, visibilityFilter]);

  const columns = [
    {
      key: "title",
      label: "Resource Title",
      render: (value: string, row: Resource) => (
        <button
          onClick={() => handleViewResource(row)}
          className="font-bold text-foreground hover:text-brand transition-colors text-xs text-left"
        >
          {value}
        </button>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "visibility",
      label: "Visibility",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "metrics",
      label: "Engagement",
      render: (v: any) => (
        <span className="text-xs text-muted-foreground font-medium">
          {v?.views || 0} views · {v?.downloads || 0} downloads
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Uploaded",
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
          title="Digital Asset & Media Resources"
          subtitle="Manage promotional banners, brand video guides, and PDF documents."
          breadcrumbs={[{ label: "Resources" }]}
          showExportButtons
          rightSlot={
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-32 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setShowAddModal(true)}
                className="h-9 gap-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4" /> Add Asset
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
          data={filteredResources}
          actionItems={[
            { label: "Inspect Resource", onClick: (row: Resource) => handleViewResource(row) },
            {
              label: "Delete Resource",
              onClick: (row: Resource) => handleDeleteResource(row._id),
            },
          ]}
          loading={loading}
          totalEntries={filteredResources.length}
        />

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full rounded-2xl border border-border shadow-2xl bg-card p-6">
              <div className="flex justify-between items-center border-b border-border/60 pb-3">
                <h3 className="font-semibold text-base text-foreground">Upload Digital Asset</h3>
                <button onClick={handleCloseModals} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 pt-4 text-xs">
                {formError && <p className="text-rose-600 font-medium">{formError}</p>}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
                    placeholder="Resource title..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                    placeholder="Short asset description..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button variant="ghost" size="sm" onClick={handleCloseModals} className="rounded-xl text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddResource}
                    disabled={submitting}
                    className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Resource"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}