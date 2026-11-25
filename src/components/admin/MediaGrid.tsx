import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { fetchMedia, uploadMedia, resolveMediaUrl, type MediaItem } from "@/lib/media";
import { Upload, Copy, Check, Loader2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaGridProps {
    /** Picker mode: clicking a thumbnail (or finishing an upload) selects it. */
    onSelect?: (item: MediaItem) => void;
    selectedUrl?: string;
}

export function MediaGrid({ onSelect, selectedUrl }: MediaGridProps) {
    const { toast } = useToast();
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadMedia = async () => {
        try {
            setLoading(true);
            const data = await fetchMedia();
            setItems(data);
        } catch {
            toast({ title: "Error", description: "Failed to load media library", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const uploaded = await uploadMedia(file);
            setItems((prev) => [uploaded, ...prev]);
            toast({ title: "Uploaded", description: "Media uploaded successfully" });
            onSelect?.(uploaded);
        } catch {
            toast({ title: "Error", description: "Failed to upload media", variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCopy = async (item: MediaItem) => {
        await navigator.clipboard.writeText(resolveMediaUrl(item.fileUrl));
        setCopiedId(item._id);
        setTimeout(() => setCopiedId((current) => (current === item._id ? null : current)), 1500);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    {items.length} file{items.length === 1 ? "" : "s"}
                </p>
                <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-gradient-to-r from-[#1766a4] to-[#207EC4] hover:from-[#155a8a] hover:to-[#1a6ba8] text-white"
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Upload Media"}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-xl" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                    <ImageOff className="h-10 w-10 mb-3" />
                    <p className="text-sm font-medium">No media uploaded yet</p>
                    <p className="text-xs">Upload an image to add it to the library.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {items.map((item) => {
                        const url = resolveMediaUrl(item.fileUrl);
                        const isSelected = selectedUrl === item.fileUrl || selectedUrl === url;
                        return (
                            <div
                                key={item._id}
                                className={cn(
                                    "group relative aspect-square rounded-xl overflow-hidden border bg-slate-50",
                                    isSelected ? "border-[#1766a4] ring-2 ring-[#1766a4]" : "border-slate-100",
                                    onSelect && "cursor-pointer"
                                )}
                                onClick={() => onSelect?.(item)}
                            >
                                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(item);
                                        }}
                                        className="h-7 px-2"
                                    >
                                        {copiedId === item._id ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-2 left-2 bg-[#1766a4] text-white rounded-full p-1">
                                        <Check className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
