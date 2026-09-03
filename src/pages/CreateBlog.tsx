import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, Image as ImageIcon, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { resolveMediaUrl, type MediaItem } from "@/lib/media";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Section = { id: string; content: string };

export default function CreateBlog() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: "",
        domain: ".com",
        featuredImageUrl: "",
        sections: [
            { id: Math.random().toString(36).substr(2, 9), content: "" }
        ] as Section[],
    });
    const [submitting, setSubmitting] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

    const handleSelectFeaturedImage = (item: MediaItem) => {
        setFormData((prev) => ({ ...prev, featuredImageUrl: resolveMediaUrl(item.fileUrl) }));
    };

    // Create post
    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();

        const combinedContent = formData.sections
            .map((section) => section.content.trim())
            .filter(Boolean)
            .join("\n\n");

        if (!combinedContent) {
            toast({ title: "Error", description: "Add some content before publishing.", variant: "destructive" });
            return;
        }

        try {
            setSubmitting(true);
            const formDataToSend = new FormData();
            formDataToSend.append("title", formData.title);
            formDataToSend.append("domain", formData.domain);
            formDataToSend.append("content", combinedContent);

            if (formData.featuredImageUrl) {
                formDataToSend.append("image", formData.featuredImageUrl);
            }

            const response = await apiFetch(`${API_BASE_URL}/post`, {
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

            navigate("/blog");
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

    // Section management
    const addTextSection = () => {
        setFormData({
            ...formData,
            sections: [...formData.sections, {
                id: Math.random().toString(36).substr(2, 9),
                content: ""
            }]
        });
    };

    const removeSection = (index: number) => {
        if (formData.sections.length <= 1) return;
        const newSections = [...formData.sections];
        newSections.splice(index, 1);
        setFormData({
            ...formData,
            sections: newSections
        });
    };

    const updateTextSection = (index: number, value: string) => {
        const newSections = [...formData.sections];
        newSections[index] = { ...newSections[index], content: value };
        setFormData({
            ...formData,
            sections: newSections
        });
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/blog")}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <PageHeader
                        title="Create New Blog Post"
                        breadcrumbs={[
                            { label: "Blog Management", href: "/blog" },
                            { label: "Create Post" }
                        ]}
                        showSearch={false}
                        showExportButtons={false}
                    />
                </div>

                <Card className="border-slate-100 shadow-sm max-w-4xl mx-auto">
                    <CardContent className="pt-6">
                        <form onSubmit={handleCreatePost} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="create-title" className="text-base font-semibold">Title</Label>
                                    <Input
                                        id="create-title"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        placeholder="Enter post title"
                                        className="text-lg py-6"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-domain" className="text-base font-semibold">Target Domain</Label>
                                    <Select
                                        value={formData.domain}
                                        onValueChange={(value) => setFormData({ ...formData, domain: value })}
                                    >
                                        <SelectTrigger id="create-domain" className="text-lg py-6 bg-white border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-slate-400" />
                                                <SelectValue placeholder="Select target domain" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=".com">app.joinonemai.ng (Global)</SelectItem>
                                            <SelectItem value=".ng">app.joinonemai.ng (Nigeria)</SelectItem>
                                            <SelectItem value=".eu">app.joinonemai.eu (Europe)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Featured Image</Label>
                                <div
                                    className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${formData.featuredImageUrl ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {formData.featuredImageUrl ? (
                                        <div className="relative w-full max-w-lg mx-auto h-64 bg-slate-100 rounded-lg overflow-hidden group">
                                            <img
                                                src={formData.featuredImageUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => setMediaPickerOpen(true)}
                                                >
                                                    Change Image
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => setMediaPickerOpen(true)}
                                        >
                                            <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <ImageIcon className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium">Click to choose a featured image</p>
                                            <p className="text-xs text-slate-400 mt-1">From the media library, or upload a new one</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <MediaPickerDialog
                                open={mediaPickerOpen}
                                onOpenChange={setMediaPickerOpen}
                                onSelect={handleSelectFeaturedImage}
                                selectedUrl={formData.featuredImageUrl}
                            />

                            <div className="space-y-6">
                                <Label className="text-base font-semibold">Content Sections</Label>
                                {formData.sections.map((section, index) => (
                                    <div key={section.id} className="relative group/section space-y-3 p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-600">
                                                Section {index + 1}
                                            </span>

                                            {formData.sections.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSection(index)}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    title="Remove Section"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <RichTextEditor
                                            id={`create-block-${index}`}
                                            value={section.content}
                                            onChange={(v) => updateTextSection(index, v)}
                                            placeholder={`Enter text for section ${index + 1}...`}
                                        />
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addTextSection}
                                    className="w-full border-dashed border-slate-300 py-6 text-slate-500 hover:text-[#1766a4] hover:border-[#1766a4] hover:bg-blue-50/30"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Text Paragraph
                                </Button>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/blog")}
                                    className="flex-1 py-6"
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-6 bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white shadow-lg"
                                >
                                    {submitting ? "Creating Post..." : "Publish Blog Post"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
