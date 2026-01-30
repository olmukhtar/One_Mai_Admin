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

import { apiFetch } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";

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

interface BlogResponse {
  posts: BlogPost[];
  message: string;
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE_URL}/admin/fetch-posts`);
      if (debouncedSearch) {
        url.searchParams.set("search", debouncedSearch);
      }

      const response = await apiFetch(url.toString(), {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data: BlogResponse = await response.json();
      setPosts(data.posts || []);
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

  // Delete post
  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      setLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/admin/delete-post/${id}`, {
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

  // Share post
  const handleSharePost = (post: BlogPost) => {
    const shareUrl = `https://app.joinonemai.com/blog/${post._id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Blog post link copied to clipboard",
    });
  };

  // Open view modal
  const openViewModal = (post: BlogPost) => {
    setSelectedPost(post);
    setIsViewModalOpen(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Blog Management"
          breadcrumbs={[{ label: "Blog Management" }]}
          showSearch={false}
          showExportButtons={false}
        />

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col gap-2 w-full max-w-md">
            <p className="text-sm text-slate-600">
              Manage your blog posts and content
            </p>
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <Button
            onClick={() => navigate("/blog/create")}
            className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white shadow-lg shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-slate-500">Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <Card className="border border-slate-100 shadow-sm rounded-xl">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchQuery ? "No matching posts found" : "No blog posts yet"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchQuery ? "Try refining your search terms" : "Get started by creating your first blog post"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => navigate("/blog/create")}
                  className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              )}
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card
                key={post._id}
                className="border border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-shadow duration-200 overflow-hidden group"
              >
                {/* Post Image */}
                {post.image && (
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={`${IMAGE_BASE_URL}/${post.image}`}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${post.status === "published"
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
                )}

                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {post.content}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewModal(post)}
                      className="flex-1 border-slate-200 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/blog/edit/${post._id}`)}
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSharePost(post)}
                      className="border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Share"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post._id)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Post Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPost?.title}</DialogTitle>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {selectedPost && formatDate(selectedPost.createdAt)}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${selectedPost?.status === "published"
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-500 text-white"
                    }`}
                >
                  {selectedPost?.status}
                </span>
                {selectedPost?.domain && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#1766a4] text-white shadow-sm flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5" />
                    {selectedPost.domain}
                  </span>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {selectedPost?.image && (
                <div className="relative w-full h-64 bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={`${IMAGE_BASE_URL}/${selectedPost.image}`}
                    alt={selectedPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">
                  {selectedPost?.content}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  if (selectedPost) {
                    navigate(`/blog/edit/${selectedPost._id}`);
                  }
                }}
                className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
