import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, HelpCircle, Loader2, HeadphonesIcon, FileQuestion } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { apiFetch, getAuthToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

interface KnowledgeBaseItem {
  _id: string;
  question: string;
  answer: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBaseResponse {
  knowledgeBaseItems: KnowledgeBaseItem[];
  message: string;
}

export default function KnowledgeBase() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    sequence: 0,
  });

  const fetchItems = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/knowledge-base`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch knowledge base items");
      }

      const data: KnowledgeBaseResponse = await response.json();
      const sortedItems = (data.knowledgeBaseItems || []).sort(
        (a, b) => a.sequence - b.sequence
      );
      setItems(sortedItems);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch knowledge base items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    if (!formData.question || !formData.answer) {
      toast({
        title: "Validation Error",
        description: "Question and answer are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiFetch(`${API_BASE_URL}/knowledge-base`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create item");
      }

      toast({
        title: "Success",
        description: "Knowledge base item created successfully",
      });

      setIsCreateModalOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create knowledge base item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !selectedItem) return;

    if (!formData.question || !formData.answer) {
      toast({
        title: "Validation Error",
        description: "Question and answer are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiFetch(
        `${API_BASE_URL}/knowledge-base/${selectedItem._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      toast({
        title: "Success",
        description: "Knowledge base item updated successfully",
      });

      setIsEditModalOpen(false);
      resetForm();
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update knowledge base item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    const token = getAuthToken();
    if (!token || !selectedItem) return;

    try {
      setSubmitting(true);
      const response = await apiFetch(
        `${API_BASE_URL}/knowledge-base/${selectedItem._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      toast({
        title: "Success",
        description: "Knowledge base item deleted successfully",
      });

      setIsDeleteAlertOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete knowledge base item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
      sequence: items.length > 0 ? items[items.length - 1].sequence + 1 : 1,
    });
  };

  const openEditModal = (item: KnowledgeBaseItem) => {
    setSelectedItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      sequence: item.sequence,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteAlert = (item: KnowledgeBaseItem) => {
    setSelectedItem(item);
    setIsDeleteAlertOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Knowledge Base & FAQ"
          subtitle="Manage customer help center articles, frequently asked questions, and instructions."
          breadcrumbs={[{ label: "Knowledge Base" }]}
          rightSlot={
            <Button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="h-9 gap-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Add FAQ Entry
            </Button>
          }
        />

        {/* Support Banner */}
        <Card className="border border-brand/20 bg-brand/10 shadow-sm rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-foreground text-sm flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-brand" /> Need help organizing topics?
              </span>
              <p className="text-xs text-muted-foreground">
                Sequence numbers control the order in which FAQ entries appear in the user app.
              </p>
            </div>
            <Button
              onClick={() => navigate("/support")}
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs font-semibold border-brand/30 text-brand hover:bg-brand hover:text-white shrink-0"
            >
              <HeadphonesIcon className="h-3.5 w-3.5 mr-1.5" /> Support Tickets
            </Button>
          </div>
        </Card>

        {/* Items List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading knowledge base entries...
          </div>
        ) : items.length === 0 ? (
          <Card className="border border-border/80 shadow-sm rounded-2xl bg-card p-12 text-center space-y-3">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">
              No knowledge base items created yet
            </h3>
            <p className="text-xs text-muted-foreground">
              Get started by adding common questions and answers for your members.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" /> Add FAQ Entry
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={item._id}
                className="border border-border/80 shadow-sm rounded-2xl bg-card hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold text-xs flex-shrink-0 mt-0.5">
                        #{item.sequence}
                      </span>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-foreground">
                          {item.question}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 rounded-lg hover:bg-muted text-brand"
                        title="Edit Entry"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteAlert(item)}
                        className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-600"
                        title="Delete Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-semibold">Add Knowledge Base FAQ</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateItem} className="space-y-4 pt-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Question</Label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How do savings circle payouts work?"
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Answer Explanation</Label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide clear step-by-step instructions..."
                  rows={4}
                  className="rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sequence Number</Label>
                <Input
                  type="number"
                  value={formData.sequence}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sequence: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border shadow-2xl bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-semibold">Edit Knowledge Base FAQ</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdateItem} className="space-y-4 pt-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Question</Label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Answer Explanation</Label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={4}
                  className="rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sequence Number</Label>
                <Input
                  type="number"
                  value={formData.sequence}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sequence: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent className="max-w-md rounded-2xl border border-border bg-card p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                This will permanently delete this Knowledge Base FAQ entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting} className="rounded-xl text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteItem();
                }}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Entry"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
