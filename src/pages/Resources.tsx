import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, X, Plus, Loader2, Upload, Trash2, Edit } from "lucide-react";

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

const AUTH_KEY = "admin_auth";
const BASE = "https://api.joinonemai.com/api";
const RESOURCES_URL = `${BASE}/admin/fetch-resource`;
const ADD_RESOURCE_URL = `${BASE}/admin/add-resource`;
const DELETE_RESOURCE_URL = `${BASE}/admin/delete-resource`;
const UPDATE_RESOURCE_URL = `${BASE}/admin/update-resource-status`;

function useToken() {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
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
    const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.role as UserRole) || null;
    } catch {
      return null;
    }
  }, []);
}

const Resources = () => {
  const token = useToken();
  const role = useUserRole();
  const navigate = useNavigate();

  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "video",
    tags: "",
    visibility: "public",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Permission checks
  const canView = role === "admin" || role === "account" || role === "customer_support" || role === "front_desk";
  const canManage = role === "admin" || role === "account";
  const isViewOnly = role === "front_desk" || role === "customer_support";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/resources" } });
      return;
    }

    if (!canView) {
      setErr("You don't have permission to view resources.");
      return;
    }

    fetchResources();
  }, [token, canView, navigate]);

  const fetchResources = () => {
    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    fetch(RESOURCES_URL, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: "application/json" 
      },
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
      .then((j: ResourcesResponse) => setData(j))
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

    if (!canManage) {
      setFormError("You don't have permission to add resources.");
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
      
      // Parse tags
      const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(Boolean);
      tagsArray.forEach(tag => formDataToSend.append("tags[]", tag));
      
      if (thumbnailFile) {
        formDataToSend.append("thumbnail", thumbnailFile);
      }
      if (resourceFile) {
        formDataToSend.append("file", resourceFile);
      }

      const response = await fetch(ADD_RESOURCE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend
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
    if (!canManage) return;
    
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await fetch(`${DELETE_RESOURCE_URL}/${resourceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });

      if (!response.ok) throw new Error("Failed to delete resource");

      await fetchResources();
      if (selectedResource?._id === resourceId) {
        handleCloseModals();
      }
    } catch (error) {
      console.error("Failed to delete resource:", error);
      setErr("Failed to delete resource");
    }
  };

  const handleUpdateStatus = async (resourceId: string, isActive: boolean) => {
    if (!canManage) return;

    try {
      const response = await fetch(`${UPDATE_RESOURCE_URL}/${resourceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (!response.ok) throw new Error("Failed to update status");

      await fetchResources();
      if (selectedResource?._id === resourceId) {
        setSelectedResource(prev => prev ? { ...prev, is_active: isActive } : null);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const columns = [
    { 
      key: "title", 
      label: "Title",
      render: (value: string, row: Resource) => (
        <button 
          onClick={() => handleViewResource(row)}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
        >
          {value}
        </button>
      )
    },
    { 
      key: "type", 
      label: "Type",
      render: (value: string) => <StatusBadge status={value} />
    },
    { 
      key: "description", 
      label: "Description",
      render: (value: string) => (
        <span className="text-slate-600 truncate max-w-xs block">
          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
        </span>
      )
    },
    { 
      key: "visibility", 
      label: "Visibility",
      render: (value: string) => <StatusBadge status={value} />
    },
    { 
      key: "metrics", 
      label: "Views",
      render: (value: any) => (
        <span className="text-slate-700">{value?.views || 0}</span>
      )
    },
    { 
      key: "is_active", 
      label: "Status",
      render: (value: boolean) => (
        <StatusBadge status={value ? "active" : "inactive"} />
      )
    },
    { 
      key: "createdAt", 
      label: "Date Created",
      render: (value: string) => 
        new Date(value).toLocaleString("en-NG", { 
          year: "numeric", 
          month: "short", 
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
    },
  ];

  const actionItems = canManage ? [
    { 
      label: "View Details", 
      onClick: (row: Resource) => handleViewResource(row)
    },
    { 
      label: "Toggle Status", 
      onClick: (row: Resource) => handleUpdateStatus(row._id, !row.is_active)
    },
    { 
      label: "Delete", 
      onClick: (row: Resource) => handleDeleteResource(row._id),
      className: "text-red-600 hover:text-red-800"
    },
  ] : [
    { 
      label: "View Details", 
      onClick: (row: Resource) => handleViewResource(row)
    }
  ];

  const filteredResources = useMemo(() => {
    if (!data?.resources) return [];
    
    let filtered = [...data.resources];
    
    if (typeFilter !== "all") {
      filtered = filtered.filter(resource => 
        resource.type.toLowerCase() === typeFilter.toLowerCase()
      );
    }
    
    if (visibilityFilter !== "all") {
      filtered = filtered.filter(resource => 
        resource.visibility.toLowerCase() === visibilityFilter.toLowerCase()
      );
    }
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(resource => 
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [data, typeFilter, visibilityFilter, searchTerm]);

  const exportToCSV = () => {
    if (!filteredResources.length) return;
    
    const headers = ["Title", "Type", "Description", "Visibility", "Views", "Downloads", "Status", "Date Created"];
    const rows = filteredResources.map(r => [
      r.title,
      r.type,
      r.description,
      r.visibility,
      r.metrics.views,
      r.metrics.downloads,
      r.is_active ? "Active" : "Inactive",
      new Date(r.createdAt).toLocaleString()
    ]);
    
    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(",")
    ).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resources-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Resources"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Resources" }
          ]}
          showSearch={false}
        />

        {isViewOnly && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            You have view-only access to resources. You cannot add, edit, or delete resources.
          </div>
        )}

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
            {err}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-wrap">
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="affiliate-only">Affiliate Only</SelectItem>
              </SelectContent>
            </Select>
           
          </div>
          
          <div className="flex gap-2 ml-auto">
            {canManage && (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <span className="text-primary">📄</span>
              <span className="ml-2">CSV</span>
            </Button>
          </div>
        </div>
        
        <DataTable 
          columns={columns}
          data={loading ? [] : filteredResources}
          actionItems={actionItems}
          totalEntries={filteredResources.length}
        />

        {loading && (
          <div className="text-center text-sm text-slate-500 py-4">
            Loading resources...
          </div>
        )}

        {!loading && filteredResources.length === 0 && !err && (
          <div className="text-center text-sm text-slate-500 py-8">
            No resources found
          </div>
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add New Resource</h2>
                <p className="text-sm text-slate-500 mt-1">Create a new promotional resource</p>
              </div>
              <button 
                onClick={handleCloseModals}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter resource title"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Enter resource description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Type
                  </label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Visibility
                  </label>
                  <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="affiliate-only">Affiliate Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. winter, video, sale"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Thumbnail
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="text-sm text-slate-600"
                  />
                  {thumbnailFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected: {thumbnailFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Resource File
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                    className="text-sm text-slate-600"
                  />
                  {resourceFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected: {resourceFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseModals} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAddResource} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Resource"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Resource Modal */}
      {showViewModal && selectedResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedResource.title}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Created {new Date(selectedResource.createdAt).toLocaleDateString("en-NG")}
                </p>
              </div>
              <button 
                onClick={handleCloseModals}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500">Type</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedResource.type} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500">Visibility</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedResource.visibility} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedResource.is_active ? "active" : "inactive"} />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500">Description</span>
                <p className="mt-1 text-sm text-slate-700">{selectedResource.description}</p>
              </div>

              {selectedResource.tags.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-slate-500">Tags</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedResource.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedResource.metrics.views}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedResource.metrics.downloads}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Downloads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedResource.metrics.shares}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Shares</div>
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedResource._id, !selectedResource.is_active)}
                  >
                    {selectedResource.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteResource(selectedResource._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Resources;