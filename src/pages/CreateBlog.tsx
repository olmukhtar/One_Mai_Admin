import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, Quote, ArrowLeft, Image as ImageIcon, FileText, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const BASE_URL = "https://api.joinonemai.com/api";

type Section =
    | { id: string; type: 'text'; content: string }
    | { id: string; type: 'image'; file: File | null; preview: string };

export default function CreateBlog() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: "",
        domain: ".com",
        featuredImage: null as File | null,
        sections: [
            { id: Math.random().toString(36).substr(2, 9), type: 'text' as const, content: "" }
        ] as Section[],
    });
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

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

    // Handle inline image selection
    const handleSectionImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newSections = [...formData.sections];
            const section = newSections[index];
            if (section.type === 'image') {
                section.file = file;
                const reader = new FileReader();
                reader.onloadend = () => {
                    section.preview = reader.result as string;
                    setFormData({ ...formData, sections: newSections });
                };
                reader.readAsDataURL(file);
            }
        }
    };

    // Create post
    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const formDataToSend = new FormData();
            formDataToSend.append("title", formData.title);
            formDataToSend.append("domain", formData.domain);

            // Construct content from sections
            // For now, we'll join text sections with double newlines
            // We might need a special way to represent images in the content string if the backend 
            // doesn't natively support structured sections.
            let combinedContent = "";
            let imageIndex = 0;

            formData.sections.forEach((section) => {
                if (section.type === 'text') {
                    if (section.content.trim()) {
                        combinedContent += section.content + "\n\n";
                    }
                } else if (section.type === 'image') {
                    if (section.file) {
                        // Append inline images with unique names
                        formDataToSend.append(`inline_image_${imageIndex}`, section.file);
                        // Add a placeholder in the content
                        combinedContent += `[IMAGE_PLACEHOLDER_${imageIndex}]\n\n`;
                        imageIndex++;
                    }
                }
            });

            formDataToSend.append("content", combinedContent.trim());

            if (formData.featuredImage) {
                formDataToSend.append("image", formData.featuredImage);
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
                type: 'text',
                content: ""
            }]
        });
    };

    const addImageSection = () => {
        setFormData({
            ...formData,
            sections: [...formData.sections, {
                id: Math.random().toString(36).substr(2, 9),
                type: 'image',
                file: null,
                preview: ""
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
        const section = newSections[index];
        if (section.type === 'text') {
            section.content = value;
            setFormData({
                ...formData,
                sections: newSections
            });
        }
    };

    const applyFormatting = (tag: string, id: string, index: number) => {
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
        updateTextSection(index, newContent);

        // Focus back to textarea
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + (selectedText ? replacement.length : replacement.indexOf("]") !== -1 ? replacement.indexOf("]") : replacement.length),
                start + (selectedText ? replacement.length : replacement.indexOf("]") !== -1 ? replacement.indexOf("]") : replacement.length)
            );
        }, 0);
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
                                            <SelectItem value=".com">app.joinonemai.com (Global)</SelectItem>
                                            <SelectItem value=".ng">app.joinonemai.ng (Nigeria)</SelectItem>
                                            <SelectItem value=".eu">app.joinonemai.eu (Europe)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="featured-image" className="text-base font-semibold">Featured Image</Label>
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
                                            <p className="text-sm text-slate-600 font-medium">Click to upload featured image</p>
                                            <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
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
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-white rounded-md border border-slate-100 shadow-sm">
                                                    {section.type === 'text' ? <FileText className="h-4 w-4 text-blue-500" /> : <ImageIcon className="h-4 w-4 text-emerald-500" />}
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">
                                                    Section {index + 1}: {section.type === 'text' ? 'Text' : 'Image'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {section.type === 'text' && (
                                                    <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => applyFormatting("bold", `create-block-${index}`, index)}
                                                            className="h-8 w-8 p-0"
                                                            title="Bold"
                                                        >
                                                            <Bold className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => applyFormatting("italic", `create-block-${index}`, index)}
                                                            className="h-8 w-8 p-0"
                                                            title="Italic"
                                                        >
                                                            <Italic className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => applyFormatting("link", `create-block-${index}`, index)}
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
                                                            onClick={() => applyFormatting("h1", `create-block-${index}`, index)}
                                                            className="h-8 w-8 p-0"
                                                            title="Heading 1"
                                                        >
                                                            <Heading1 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => applyFormatting("h2", `create-block-${index}`, index)}
                                                            className="h-8 w-8 p-0"
                                                            title="Heading 2"
                                                        >
                                                            <Heading2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => applyFormatting("list", `create-block-${index}`, index)}
                                                            className="h-8 w-8 p-0"
                                                            title="List"
                                                        >
                                                            <List className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => applyFormatting("quote", `create-block-${index}`, index)}
                                                            className="h-8 w-8 p-0"
                                                            title="Quote"
                                                        >
                                                            <Quote className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}

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

                                        {section.type === 'text' ? (
                                            <Textarea
                                                id={`create-block-${index}`}
                                                value={section.content}
                                                onChange={(e) => updateTextSection(index, e.target.value)}
                                                placeholder={`Enter text for section ${index + 1}...`}
                                                className="min-h-[120px] bg-white resize-none"
                                                required={index === 0}
                                            />
                                        ) : (
                                            <div
                                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-white ${section.preview ? 'border-blue-200' : 'border-slate-200'
                                                    }`}
                                            >
                                                {section.preview ? (
                                                    <div className="relative w-full max-w-md mx-auto h-48 bg-slate-100 rounded-lg overflow-hidden group">
                                                        <img
                                                            src={section.preview}
                                                            alt="Preview"
                                                            className="w-full h-full object-contain"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => document.getElementById(`section-image-${index}`)?.click()}
                                                            >
                                                                Change Image
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="cursor-pointer"
                                                        onClick={() => document.getElementById(`section-image-${index}`)?.click()}
                                                    >
                                                        <Plus className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                                        <p className="text-sm text-slate-600 font-medium">Click to upload section image</p>
                                                    </div>
                                                )}
                                                <Input
                                                    id={`section-image-${index}`}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleSectionImageChange(index, e)}
                                                    className="hidden"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addTextSection}
                                        className="border-dashed border-slate-300 py-6 text-slate-500 hover:text-[#1766a4] hover:border-[#1766a4] hover:bg-blue-50/30"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Text Paragraph
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addImageSection}
                                        className="border-dashed border-slate-300 py-6 text-slate-500 hover:text-emerald-600 hover:border-emerald-600 hover:bg-emerald-50/30"
                                    >
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        Add Image Section
                                    </Button>
                                </div>
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
