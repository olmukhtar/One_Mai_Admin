import { useEffect, useMemo, useState, useRef } from "react";
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

const getResourceUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
  return `${API_BASE_URL}/${cleanUrl}`;
};

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
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleThumbnailDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingThumbnail(true);
  };

  const handleThumbnailDragLeave = () => {
    setIsDraggingThumbnail(false);
  };

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingThumbnail(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setThumbnailFile(file);
      } else {
        setFormError("Thumbnail must be an image file");
      }
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResourceFile(e.dataTransfer.files[0]);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setThumbnailFile(file);
      } else {
        setFormError("Thumbnail must be an image file");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResourceFile(e.target.files[0]);
    }
  };

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
      let computedType = "document";
      if (resourceFile) {
        if (typeof resourceFile === "string") {
          computedType = "link";
        } else {
          const mime = resourceFile.type;
          if (mime.startsWith("video/")) {
            computedType = "video";
          } else if (mime.startsWith("image/")) {
            computedType = "image";
          } else {
            computedType = "document";
          }
        }
      }
      formDataToSend.append("type", computedType);
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
            <Card className="max-w-xl w-full rounded-2xl border border-border shadow-2xl bg-card p-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Thumbnail Upload */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Thumbnail</label>
                    <input
                      type="file"
                      ref={thumbnailInputRef}
                      onChange={handleThumbnailChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {thumbnailFile ? (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden border border-border bg-muted group">
                        <img
                          src={URL.createObjectURL(thumbnailFile)}
                          alt="Thumbnail Preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setThumbnailFile(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={handleThumbnailDragOver}
                        onDragLeave={handleThumbnailDragLeave}
                        onDrop={handleThumbnailDrop}
                        onClick={() => thumbnailInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                          isDraggingThumbnail
                            ? "border-brand bg-brand/5 scale-[0.99]"
                            : "border-border hover:border-brand/50 hover:bg-muted/40"
                        }`}
                      >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <div className="text-center px-2">
                          <p className="font-semibold text-[11px] text-foreground">Drag & drop thumbnail</p>
                          <p className="text-[9px] text-muted-foreground">or click to upload (Image only)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resource File Upload */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Asset File</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {resourceFile ? (
                      <div className="relative h-28 w-full rounded-xl border border-border bg-muted/30 p-3 flex flex-col justify-between group">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-[11px] text-foreground truncate">
                              {typeof resourceFile === "string" ? resourceFile : resourceFile.name}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              {typeof resourceFile === "string"
                                ? "Link source"
                                : `${(resourceFile.size / 1024 / 1024).toFixed(2)} MB`}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2.5 rounded-lg text-[10px] text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResourceFile(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={handleFileDragOver}
                        onDragLeave={handleFileDragLeave}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                          isDraggingFile
                            ? "border-brand bg-brand/5 scale-[0.99]"
                            : "border-border hover:border-brand/50 hover:bg-muted/40"
                        }`}
                      >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <div className="text-center px-2">
                          <p className="font-semibold text-[11px] text-foreground">Drag & drop asset file</p>
                          <p className="text-[9px] text-muted-foreground">or click to upload</p>
                        </div>
                      </div>
                    )}
                  </div>
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

        {/* View Modal */}
        {showViewModal && selectedResource && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-xl w-full rounded-2xl border border-border shadow-2xl bg-card p-6 overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">Resource Details</h3>
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                    ID: {selectedResource._id}
                  </span>
                </div>
                <button onClick={handleCloseModals} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-5 pt-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
                {/* Main Info */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-bold text-foreground leading-tight text-left">
                      {selectedResource.title}
                    </h4>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <StatusBadge status={selectedResource.type} />
                      <StatusBadge status={selectedResource.visibility} />
                    </div>
                  </div>
                  {selectedResource.tags && selectedResource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedResource.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted text-muted-foreground text-[9px] font-medium rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                {selectedResource.thumbnail && (
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-border bg-muted">
                    <img
                      src={getResourceUrl(selectedResource.thumbnail)}
                      alt={selectedResource.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1 bg-muted/20 p-3 rounded-xl border border-border/40 text-left">
                  <label className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Description
                  </label>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedResource.description || "No description provided."}
                  </p>
                </div>

                {/* File attachment */}
                {selectedResource.file && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-foreground truncate max-w-[280px]">
                          {selectedResource.file.split("/").pop()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Asset Source File</p>
                      </div>
                    </div>
                    <a
                      href={getResourceUrl(selectedResource.file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-[11px] font-semibold transition-colors duration-200"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card p-3 rounded-xl border border-border text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">Views</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {selectedResource.metrics?.views || 0}
                    </p>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">Downloads</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {selectedResource.metrics?.downloads || 0}
                    </p>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">Shares</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {selectedResource.metrics?.shares || 0}
                    </p>
                  </div>
                </div>

                {/* Details & Dates */}
                <div className="grid grid-cols-2 gap-4 text-[10px] text-muted-foreground border-t border-border/55 pt-3 text-left">
                  <div>
                    <span className="font-semibold text-muted-foreground block">Uploaded</span>
                    <span className="text-foreground">
                      {new Date(selectedResource.createdAt).toLocaleString("en-NG", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block">Last Updated</span>
                    <span className="text-foreground">
                      {new Date(selectedResource.updatedAt).toLocaleString("en-NG", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 mt-4 border-t border-border/60">
                <Button
                  size="sm"
                  onClick={handleCloseModals}
                  className="rounded-xl text-xs bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}