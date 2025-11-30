import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, Calendar, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://api.joinonemai.com/api";
const IMAGE_BASE_URL = "https://api.joinonemai.com";
const AUTH_STORAGE_KEY = "admin_auth";

interface BlogPost {
  _id: string;
  image: string;
  title: string;
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

function getAuthToken(): string | null {
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
}

export default function BlogManagement() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch posts
  const fetchPosts = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/admin/fetch-posts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
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
  }, []);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    if (!formData.title || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", formData.content);
      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      const response = await fetch(`${BASE_URL}/admin/create-post`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      toast({
        title: "Success",
        description: "Blog post created successfully",
      });

      setIsCreateModalOpen(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create blog post",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update post
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !selectedPost) return;

    if (!formData.title || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", formData.content);
      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      const response = await fetch(
        `${BASE_URL}/admin/update-post/${selectedPost._id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update post");
      }

      toast({
        title: "Success",
        description: "Blog post updated successfully",
      });

      setIsEditModalOpen(false);
      resetForm();
      setSelectedPost(null);
      fetchPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update blog post",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      image: null,
    });
    setImagePreview("");
  };

  // Open edit modal
  const openEditModal = (post: BlogPost) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      image: null,
    });
    setImagePreview(`${IMAGE_BASE_URL}/${post.image}`);
    setIsEditModalOpen(true);
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
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            Manage your blog posts and content
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white shadow-lg"
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
                No blog posts yet
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Get started by creating your first blog post
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
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
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${post.status === "published"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-white"
                          }`}
                      >
                        {post.status}
                      </span>
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
                      onClick={() => openEditModal(post)}
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Blog Post</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new blog post
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-title">Title</Label>
                <Input
                  id="create-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter post title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-content">Content</Label>
                <Textarea
                  id="create-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your blog post content here..."
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-image">Image</Label>
                <Input
                  id="create-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="mt-2 relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                >
                  {submitting ? "Creating..." : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Post Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Blog Post</DialogTitle>
              <DialogDescription>
                Update the details of your blog post
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter post title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your blog post content here..."
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-image">Image (optional - leave empty to keep current)</Label>
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="mt-2 relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                    setSelectedPost(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                >
                  {submitting ? "Updating..." : "Update Post"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
                    openEditModal(selectedPost);
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
