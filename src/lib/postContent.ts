import { renderCustomMarkup } from "@/lib/customMarkup";

/** One block of a blog post's `content` array — the backend's current
 * schema (POST/PUT /api/post). `content` is real HTML for "text" blocks
 * (stored and returned unstripped) and a media URL for "image" blocks. */
export type ContentBlock = { type: "text" | "image"; content: string };

/** A section as edited in the admin UI — same shape as ContentBlock plus a
 * stable local id for React keys. */
export type Section = { id: string; type: "text" | "image"; content: string };

const newId = () => Math.random().toString(36).substr(2, 9);

export const newTextSection = (content = ""): Section => ({ id: newId(), type: "text", content });
export const newImageSection = (content: string): Section => ({ id: newId(), type: "image", content });

/**
 * Converts a fetched post's `content` field into editable sections.
 * Handles both shapes: the current block-array schema, and the older
 * schema where `content` was a single string (plain text, or the custom
 * markup syntax from before the backend accepted real HTML) — those load
 * as one text section with the legacy syntax rendered to HTML, and
 * naturally upgrade to the new schema next time the post is saved.
 */
export const contentToSections = (content: unknown): Section[] => {
    if (Array.isArray(content)) {
        const sections = content
            .filter((block): block is ContentBlock => block && typeof block === "object" && typeof block.content === "string")
            .map((block) => ({
                id: newId(),
                type: block.type === "image" ? ("image" as const) : ("text" as const),
                content: block.content,
            }));
        return sections.length ? sections : [newTextSection()];
    }

    if (typeof content === "string" && content.trim()) {
        return [newTextSection(renderCustomMarkup(content))];
    }

    return [newTextSection()];
};

/** Converts editable sections back into the block array the backend
 * expects, dropping empty ones. */
export const sectionsToContent = (sections: Section[]): ContentBlock[] =>
    sections
        .filter((section) => section.content && section.content.trim())
        .map((section) => ({ type: section.type, content: section.content }));

/** Plain-text preview for the blog list/detail views (BlogManagement.tsx) —
 * handles both the block-array schema and legacy string content. */
export const excerptFromContent = (content: unknown): string => {
    if (Array.isArray(content)) {
        return content
            .filter((block): block is ContentBlock => block?.type === "text" && typeof block.content === "string")
            .map((block) => block.content.replace(/<[^>]+>/g, " "))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
    }

    if (typeof content === "string") {
        return content.replace(/[*#>-]/g, "").replace(/\s+/g, " ").trim();
    }

    return "";
};
