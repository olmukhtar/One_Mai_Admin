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
import { Plus, Pencil, Trash2, HelpCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { apiFetch, AUTH_STORAGE_KEY, getAuthToken } from "@/lib/api";
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
    const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        question: "",
        answer: "",
        sequence: 0,
    });

    // Fetch items
    const fetchItems = async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
            setLoading(true);
            const response = await apiFetch(`${API_BASE_URL}/admin/knowledge-base`, {
                method: "GET",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch knowledge base items");
            }

            const data: KnowledgeBaseResponse = await response.json();
            // Sort by sequence
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

    // Create item
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
            const response = await apiFetch(`${API_BASE_URL}/admin/knowledge-base`, {
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

    // Update item
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
                `${API_BASE_URL}/admin/knowledge-base/${selectedItem._id}`,
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

    // Delete item
    const handleDeleteItem = async () => {
        const token = getAuthToken();
        if (!token || !selectedItem) return;

        try {
            setSubmitting(true);
            const response = await apiFetch(
                `${API_BASE_URL}/admin/knowledge-base/${selectedItem._id}`,
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

    // Reset form
    const resetForm = () => {
        setFormData({
            question: "",
            answer: "",
            sequence: items.length > 0 ? items[items.length - 1].sequence + 1 : 1,
        });
    };

    // Open edit modal
    const openEditModal = (item: KnowledgeBaseItem) => {
        setSelectedItem(item);
        setFormData({
            question: item.question,
            answer: item.answer,
            sequence: item.sequence,
        });
        setIsEditModalOpen(true);
    };

    // Open delete alert
    const openDeleteAlert = (item: KnowledgeBaseItem) => {
        setSelectedItem(item);
        setIsDeleteAlertOpen(true);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Knowledge Base"
                    breadcrumbs={[{ label: "Knowledge Base" }]}
                    showSearch={false}
                    showExportButtons={false}
                />

                {/* Action Bar */}
                <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-600">
                        Manage FAQs and help content
                    </p>
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white shadow-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                </div>

                {/* Items List */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : items.length === 0 ? (
                    <Card className="border border-slate-100 shadow-sm rounded-xl">
                        <CardContent className="py-12 text-center">
                            <HelpCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                No knowledge base items yet
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Get started by creating your first FAQ item
                            </p>
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setIsCreateModalOpen(true);
                                }}
                                className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {items.map((item) => (
                            <Card
                                key={item._id}
                                className="border border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-shadow duration-200"
                            >
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                                    {item.sequence}
                                                </span>
                                                <h3 className="font-semibold text-slate-900">
                                                    {item.question}
                                                </h3>
                                            </div>
                                            <p className="text-slate-600 pl-8 whitespace-pre-wrap">
                                                {item.answer}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditModal(item)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openDeleteAlert(item)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
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
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add Knowledge Base Item</DialogTitle>
                            <DialogDescription>
                                Create a new FAQ item for the knowledge base
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-question">Question</Label>
                                <Input
                                    id="create-question"
                                    value={formData.question}
                                    onChange={(e) =>
                                        setFormData({ ...formData, question: e.target.value })
                                    }
                                    placeholder="Enter the question"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-answer">Answer</Label>
                                <Textarea
                                    id="create-answer"
                                    value={formData.answer}
                                    onChange={(e) =>
                                        setFormData({ ...formData, answer: e.target.value })
                                    }
                                    placeholder="Enter the answer"
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-sequence">Sequence Order</Label>
                                <Input
                                    id="create-sequence"
                                    type="number"
                                    value={formData.sequence}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sequence: parseInt(e.target.value) || 0,
                                        })
                                    }
                                    placeholder="Order number"
                                    required
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Item"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit Knowledge Base Item</DialogTitle>
                            <DialogDescription>
                                Update the FAQ item details
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdateItem} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-question">Question</Label>
                                <Input
                                    id="edit-question"
                                    value={formData.question}
                                    onChange={(e) =>
                                        setFormData({ ...formData, question: e.target.value })
                                    }
                                    placeholder="Enter the question"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-answer">Answer</Label>
                                <Textarea
                                    id="edit-answer"
                                    value={formData.answer}
                                    onChange={(e) =>
                                        setFormData({ ...formData, answer: e.target.value })
                                    }
                                    placeholder="Enter the answer"
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-sequence">Sequence Order</Label>
                                <Input
                                    id="edit-sequence"
                                    type="number"
                                    value={formData.sequence}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sequence: parseInt(e.target.value) || 0,
                                        })
                                    }
                                    placeholder="Order number"
                                    required
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditModalOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Item"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Alert */}
                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the
                                knowledge base item.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteItem();
                                }}
                                disabled={submitting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
}
