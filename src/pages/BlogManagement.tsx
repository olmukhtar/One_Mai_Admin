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
import { Plus, Pencil, Trash2, FileText, Calendar, Eye, Share2, Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, Quote, Type, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";

const BASE_URL = "https://api.joinonemai.com/api";
const IMAGE_BASE_URL = "https://api.joinonemai.com";

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



export default function BlogManagement() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    contentBlocks: [""] as string[],
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

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
      const url = new URL(`${BASE_URL}/admin/fetch-posts`);
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
    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);

      // Join blocks with double newlines for submission
      const combinedContent = formData.contentBlocks.filter(b => b.trim()).join("\n\n");
      formDataToSend.append("content", combinedContent);

      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      const response = await apiFetch(`${BASE_URL}/admin/create-post`, {
        method: "POST",
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
    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);

      // Join blocks with double newlines for submission
      const combinedContent = formData.contentBlocks.filter(b => b.trim()).join("\n\n");
      formDataToSend.append("content", combinedContent);

      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      const response = await apiFetch(
        `${BASE_URL}/admin/update-post/${selectedPost?._id}`,
        {
          method: "PUT",
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

  // Delete post
  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      setLoading(true);
      const response = await apiFetch(`${BASE_URL}/admin/delete-post/${id}`, {
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
    const shareUrl = `https://joinonemai.com/blog/${post._id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Blog post link copied to clipboard",
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      contentBlocks: [""],
      image: null,
    });
    setImagePreview("");
  };

  // Block management
  const addBlock = () => {
    setFormData({
      ...formData,
      contentBlocks: [...formData.contentBlocks, ""]
    });
  };

  const removeBlock = (index: number) => {
    if (formData.contentBlocks.length <= 1) return;
    const newBlocks = [...formData.contentBlocks];
    newBlocks.splice(index, 1);
    setFormData({
      ...formData,
      contentBlocks: newBlocks
    });
  };

  const updateBlock = (index: number, value: string) => {
    const newBlocks = [...formData.contentBlocks];
    newBlocks[index] = value;
    setFormData({
      ...formData,
      contentBlocks: newBlocks
    });
  };

  // Open edit modal
  const openEditModal = (post: BlogPost) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      contentBlocks: post.content ? post.content.split(/\n\n+/) : [""],
      image: null,
    });
    setImagePreview(`${IMAGE_BASE_URL}/${post.image}`);
    setIsEditModalOpen(true);
  };

  const applyFormatting = (tag: string, id: string) => {
    const textarea = document.getElementById(id) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    if (tag === "bold") replacement = `**${selectedText}**`;
    else if (tag === "italic") replacement = `*${selectedText}*`;
    else if (tag === "link") replacement = `[${selectedText || "link text"}](url)`;
    else if (tag === "h1") replacement = `\n# ${selectedText}`;
    else if (tag === "h2") replacement = `\n## ${selectedText}`;
    else if (tag === "list") replacement = `\n- ${selectedText}`;
    else if (tag === "quote") replacement = `\n> ${selectedText}`;
    else if (tag === "paragraph") replacement = `\n\n${selectedText}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);

    const match = id.match(/block-(\d+)/);
    if (match) {
      const index = parseInt(match[1]);
      updateBlock(index, newContent);
    }

    // Focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + (selectedText ? replacement.length : replacement.indexOf("]") !== -1 ? replacement.indexOf("]") : replacement.length),
        start + (selectedText ? replacement.length : replacement.indexOf("]") !== -1 ? replacement.indexOf("]") : replacement.length)
      );
    }, 0);
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
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
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
                  onClick={() => {
                    resetForm();
                    setIsCreateModalOpen(true);
                  }}
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

              <div className="space-y-4">
                <Label>Content (Paragraph by Paragraph)</Label>
                {formData.contentBlocks.map((block, index) => (
                  <div key={index} className="space-y-2 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Paragraph {index + 1}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("bold", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Bold"
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("italic", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Italic"
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("link", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Insert Link"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("h1", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Heading 1"
                        >
                          <Heading1 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("h2", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Heading 2"
                        >
                          <Heading2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("list", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="List"
                        >
                          <List className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("quote", `create-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Quote"
                        >
                          <Quote className="h-3.5 w-3.5" />
                        </Button>
                        {formData.contentBlocks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlock(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                            title="Remove Paragraph"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      id={`create-block-${index}`}
                      value={block}
                      onChange={(e) => updateBlock(index, e.target.value)}
                      placeholder={`Enter paragraph ${index + 1}...`}
                      rows={3}
                      required={index === 0}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addBlock}
                  className="w-full border-dashed border-slate-300 text-slate-500 hover:text-[#1766a4] hover:border-[#1766a4] hover:bg-blue-50/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Paragraph
                </Button>
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

              <div className="space-y-4">
                <Label>Content (Paragraph by Paragraph)</Label>
                {formData.contentBlocks.map((block, index) => (
                  <div key={index} className="space-y-2 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Paragraph {index + 1}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("bold", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Bold"
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("italic", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Italic"
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("link", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Insert Link"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("h1", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Heading 1"
                        >
                          <Heading1 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("h2", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Heading 2"
                        >
                          <Heading2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("list", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="List"
                        >
                          <List className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyFormatting("quote", `edit-block-${index}`)}
                          className="h-7 w-7 p-0"
                          title="Quote"
                        >
                          <Quote className="h-3.5 w-3.5" />
                        </Button>
                        {formData.contentBlocks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlock(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                            title="Remove Paragraph"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      id={`edit-block-${index}`}
                      value={block}
                      onChange={(e) => updateBlock(index, e.target.value)}
                      placeholder={`Enter paragraph ${index + 1}...`}
                      rows={3}
                      required={index === 0}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addBlock}
                  className="w-full border-dashed border-slate-300 text-slate-500 hover:text-[#1766a4] hover:border-[#1766a4] hover:bg-blue-50/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Paragraph
                </Button>
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
