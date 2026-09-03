import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, Quote, ArrowLeft, Loader2, Image as ImageIcon, Globe, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";
import { renderCustomMarkup } from "@/lib/customMarkup";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BlogPost {
    _id: string;
    image: string;
    title: string;
    domain?: string;
    content: string;
    status: "published" | "draft";
    createdAt: string;
    updatedAt: string;
}

type Section = { id: string; content: string };

export default function EditBlog() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [post, setPost] = useState<BlogPost | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        domain: ".com",
        featuredImage: null as File | null,
        sections: [] as Section[],
    });
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string>("");

    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                const response = await apiFetch(`${API_BASE_URL}/post`);
                if (!response.ok) throw new Error("Failed to fetch posts");

                const json = await response.json();
                const responseData = json.data || json;
                const foundPost = (responseData.posts || responseData || []).find((p: BlogPost) => p._id === id);

                if (foundPost) {
                    setPost(foundPost);

                    // Parse content into sections
                    const initialSections = foundPost.content
                        ? foundPost.content.split(/\n\n+/).map((text: string) => ({
                            id: Math.random().toString(36).substr(2, 9),
                            content: text
                        }))
                        : [{ id: Math.random().toString(36).substr(2, 9), content: "" }];

                    setFormData({
                        title: foundPost.title,
                        domain: foundPost.domain || ".com",
                        featuredImage: null,
                        sections: initialSections,
                    });
                    setFeaturedImagePreview(`${IMAGE_BASE_URL}/${foundPost.image}`);
                } else {
                    toast({
                        title: "Error",
                        description: "Post not found",
                        variant: "destructive",
                    });
                    navigate("/blog");
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load blog post",
                    variant: "destructive",
                });
                navigate("/blog");
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [id, navigate, toast]);

    // Handle featured image selection
    const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, featuredImage: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setFeaturedImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Update post
    const handleUpdatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const formDataToSend = new FormData();
            formDataToSend.append("title", formData.title);
            formDataToSend.append("domain", formData.domain);

            const combinedContent = formData.sections
                .map((section) => section.content.trim())
                .filter(Boolean)
                .join("\n\n");

            formDataToSend.append("content", combinedContent);

            if (formData.featuredImage) {
                formDataToSend.append("image", formData.featuredImage);
            }

            const response = await apiFetch(`${API_BASE_URL}/post/${id}`, {
                method: "PUT",
                body: formDataToSend,
            });

            if (!response.ok) {
                throw new Error("Failed to update post");
            }

            toast({
                title: "Success",
                description: "Blog post updated successfully",
            });

            navigate("/blog");
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

    const applyFormatting = (tag: string, id: string, index: number) => {
        const textarea = document.getElementById(id) as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        let replacement = "";
        if (tag === "bold") replacement = `**${selectedText || "bold text"}**`;
        else if (tag === "italic") replacement = `*${selectedText || "italic text"}*`;
        else if (tag === "link") replacement = `[${selectedText || "link text"}](url)`;
        else if (tag === "h1") replacement = `\n# ${selectedText || "Heading"}`;
        else if (tag === "h2") replacement = `\n## ${selectedText || "Subheading"}`;
        else if (tag === "list") replacement = `\n- ${selectedText || "List item"}`;
        else if (tag === "quote") replacement = `\n> ${selectedText || "Quote"}`;

        const newContent = text.substring(0, start) + replacement + text.substring(end);
        updateTextSection(index, newContent);

        // Focus back to textarea
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + replacement.length,
                start + replacement.length
            );
        }, 0);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-slate-500 font-medium">Loading blog post details...</p>
                </div>
            </AdminLayout>
        );
    }

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
                        title="Edit Blog Post"
                        breadcrumbs={[
                            { label: "Blog Management", href: "/blog" },
                            { label: "Edit Post" }
                        ]}
                        showSearch={false}
                        showExportButtons={false}
                    />
                </div>

                <Card className="border-slate-100 shadow-sm max-w-4xl mx-auto">
                    <CardContent className="pt-6">
                        <form onSubmit={handleUpdatePost} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-title" className="text-base font-semibold">Title</Label>
                                    <Input
                                        id="edit-title"
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
                                    <Label htmlFor="edit-domain" className="text-base font-semibold">Target Domain</Label>
                                    <Select
                                        value={formData.domain}
                                        onValueChange={(value) => setFormData({ ...formData, domain: value })}
                                    >
                                        <SelectTrigger id="edit-domain" className="text-lg py-6 bg-white border-slate-200">
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
                                <Label htmlFor="featured-image" className="text-base font-semibold">Featured Image (leave empty to keep current)</Label>
                                <div
                                    className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${featuredImagePreview ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {featuredImagePreview ? (
                                        <div className="relative w-full max-w-lg mx-auto h-64 bg-slate-100 rounded-lg overflow-hidden group">
                                            <img
                                                src={featuredImagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => document.getElementById('featured-image')?.click()}
                                                >
                                                    Change Image
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => document.getElementById('featured-image')?.click()}
                                        >
                                            <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <ImageIcon className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium">Click to upload new featured image</p>
                                        </div>
                                    )}
                                    <Input
                                        id="featured-image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFeaturedImageChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Label className="text-base font-semibold">Content Sections</Label>
                                {formData.sections.map((section, index) => (
                                    <div key={section.id} className="relative group/section space-y-4 p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-600">
                                                Section {index + 1}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("bold", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="Bold"
                                                    >
                                                        <Bold className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("italic", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="Italic"
                                                    >
                                                        <Italic className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("link", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="Insert Link"
                                                    >
                                                        <LinkIcon className="h-4 w-4" />
                                                    </Button>
                                                    <div className="w-px h-5 bg-slate-200 mx-1 self-center" />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("h1", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="Heading 1"
                                                    >
                                                        <Heading1 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("h2", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="Heading 2"
                                                    >
                                                        <Heading2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("list", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="List"
                                                    >
                                                        <List className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applyFormatting("quote", `edit-block-${index}`, index)}
                                                        className="h-8 w-8 p-0"
                                                        title="Quote"
                                                    >
                                                        <Quote className="h-4 w-4" />
                                                    </Button>
                                                </div>

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
                                        </div>

                                        <Textarea
                                            id={`edit-block-${index}`}
                                            value={section.content}
                                            onChange={(e) => updateTextSection(index, e.target.value)}
                                            placeholder={`Enter text for section ${index + 1}...`}
                                            className="min-h-[120px] bg-white resize-none font-mono text-sm"
                                            required={index === 0}
                                        />

                                        {section.content.trim() && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Preview
                                                </div>
                                                <div
                                                    className="prose prose-sm max-w-none bg-white rounded-lg border border-slate-100 p-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_a]:text-blue-600 [&_a]:underline"
                                                    dangerouslySetInnerHTML={{ __html: renderCustomMarkup(section.content) }}
                                                />
                                            </div>
                                        )}
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
                                    {submitting ? "Updating Post..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
