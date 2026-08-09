import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, Calendar, Eye, Share2, X, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/admin/StatusBadge";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";

function resolveImageUrl(path?: string) {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${IMAGE_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

interface BlogPost {
  _id: string;
  image: string;
  title: string;
  domain?: string;
  content: string;
  status: "published" | "draft";
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export default function BlogManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE_URL}/post`);
      if (debouncedSearch) {
        url.searchParams.set("search", debouncedSearch);
      }

      const response = await apiFetch(url.toString(), {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const json = await response.json();
      const responseData = json.data || json;
      setPosts(responseData.posts || responseData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch blog posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [debouncedSearch]);

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      setLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/post/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });
      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete blog post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSharePost = (post: BlogPost) => {
    const shareUrl = `https://app.joinonemai.ng/blog/${post._id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Blog post link copied to clipboard",
    });
  };

  const openViewModal = (post: BlogPost) => {
    setSelectedPost(post);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Blog & Publishing Manager"
          subtitle="Create, edit, publish, and distribute content across Onemai web properties."
          breadcrumbs={[{ label: "Blog Management" }]}
          rightSlot={
            <Button
              onClick={() => navigate("/blog/create")}
              className="h-9 gap-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Create New Article
            </Button>
          }
        />

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Input
              type="text"
              placeholder="Search posts by title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-4 pr-10 rounded-xl border-border/80 text-xs bg-card focus:border-brand"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border border-border/80 h-72 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-12 text-center space-y-3">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">
              {searchQuery ? "No matching posts found" : "No published articles yet"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Try refining your search keyword." : "Get started by publishing your first blog post."}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => navigate("/blog/create")}
                className="rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" /> Create Post
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card
                key={post._id}
                className="border border-border/80 shadow-sm rounded-2xl bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Post Image */}
                {post.image ? (
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          post.status === "published"
                            ? "bg-emerald-500 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {post.status}
                      </span>
                      {post.domain && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/90 text-[#1766a4] shadow-sm flex items-center gap-1 backdrop-blur-sm border border-slate-100">
                          <Globe className="h-2.5 w-2.5" />
                          {post.domain}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* If no image, render status and domain badges in a smaller header area */
                  <div className="p-4 pb-0 flex justify-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        post.status === "published"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {post.status}
                    </span>
                    {post.domain && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-[#1766a4] border border-slate-200 shadow-sm flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {post.domain}
                      </span>
                    )}
                  </div>
                )}

                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-bold text-foreground line-clamp-2 leading-snug">
                    {post.title}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                </CardContent>

                <div className="p-4 border-t border-border/60 flex items-center justify-between gap-2 bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openViewModal(post)}
                    className="flex-1 h-8 rounded-lg text-xs font-semibold border-border/80"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/blog/edit/${post._id}`)}
                    className="flex-1 h-8 rounded-lg text-xs font-semibold border-brand/30 text-brand hover:bg-brand hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSharePost(post)}
                    className="h-8 w-8 p-0 rounded-lg border-border/80 text-muted-foreground"
                    title="Share Link"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePost(post._id)}
                    className="h-8 w-8 p-0 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Delete Article"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border p-6 bg-card">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-lg font-bold text-foreground">
                {selectedPost?.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                <span>{selectedPost && formatDate(selectedPost.createdAt)}</span>
                <StatusBadge status={selectedPost?.status} />
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs leading-relaxed text-foreground">
              {selectedPost?.image && (
                <div className="h-56 rounded-xl overflow-hidden bg-muted">
                  <img
                    src={resolveImageUrl(selectedPost.image)}
                    alt={selectedPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="whitespace-pre-wrap">{selectedPost?.content}</p>
            </div>

            <DialogFooter className="border-t border-border/60 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setIsViewModalOpen(false)} className="rounded-xl text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
