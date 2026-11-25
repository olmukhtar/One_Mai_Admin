import { apiFetch } from "@/lib/api";
import { API_BASE_URL, IMAGE_BASE_URL } from "@/lib/constants";

export interface MediaItem {
    _id: string;
    fileUrl: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

/** GET /api/media returns both absolute and root-relative fileUrls. */
export const resolveMediaUrl = (fileUrl: string): string =>
    /^https?:\/\//i.test(fileUrl) ? fileUrl : `${IMAGE_BASE_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;

export async function fetchMedia(offset = 0, limit = 100): Promise<MediaItem[]> {
    const response = await apiFetch(`${API_BASE_URL}/media?type=&offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch media");
    const json = await response.json();
    return (json.data || []) as MediaItem[];
}

export async function uploadMedia(file: File): Promise<MediaItem> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(`${API_BASE_URL}/media/upload`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload media");
    const json = await response.json();
    const item = Array.isArray(json.data) ? json.data[0] : json.data;
    if (!item) throw new Error("Upload response missing media data");
    return item as MediaItem;
}
