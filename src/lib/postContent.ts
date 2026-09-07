import { renderCustomMarkup, stripCustomMarkup } from "@/lib/customMarkup";

/**
 * Normalising a post's `content` for the admin editor.
 *
 * The backend contract (Postman: POST/PUT {{baseUrl}}/api/post) is:
 *
 *   { title, image, content: [ { type: "text" | "image", content: string } ] }
 *
 * where a "text" block's `content` is real HTML — the tags typed in
 * RichTextEditor, stored and returned unstripped — and an "image" block's
 * `content` is a media URL. That is what `sectionsToContent` always writes.
 *
 * Reads have to cope with more: three legacy shapes exist in the DB, so
 * everything comes in through `normalizeContentBlocks`.
 *
 *   1. `content` as a single string  — the oldest posts, before the field
 *      became an array.
 *   2. an array of bare strings      — the array landed, the block wrapper
 *                                      did not.
 *   3. an array of character maps    — `{"0":"A","1":" ","2":"f", ...}`, a
 *      string that got object-spread on the way into Mongo. Such a block has
 *      no `content` key, so it used to load as an empty editor — and saving
 *      over it destroyed the post's text.
 *
 * Opening a legacy post now fills the editor with its real text as HTML, so
 * the next save upgrades the record to the current schema.
 *
 * Website twin: Website/lib/postContent.ts — keep both in sync.
 */

/** One block of a post's `content` array, as the backend stores it. */
export type ContentBlock = { type: "text" | "image"; content: string };

/** A section as edited in the admin UI — same shape as ContentBlock plus a
 * stable local id for React keys. */
export type Section = { id: string; type: "text" | "image"; content: string };

const newId = () => Math.random().toString(36).slice(2, 11);

export const newTextSection = (content = ""): Section => ({ id: newId(), type: "text", content });
export const newImageSection = (content: string): Section => ({ id: newId(), type: "image", content });

/** True for text that already carries HTML tags (the rich-text editor's
 *  output). Plain-text content goes through the markup renderer instead so
 *  its blank lines become real paragraphs rather than one unbroken wall. */
const looksLikeHtml = (value: string): boolean => /<\/?[a-z][^>]*>/i.test(value);

/**
 * Rebuilds a string that was stored character-by-character as an object —
 * `{"0":"A","1":" ","2":"f"}` → `"A f"`. Returns null if `value` is not
 * that shape, so a genuine block object is never mistaken for one.
 */
const stringFromCharMap = (value: Record<string, unknown>): string | null => {
    const keys = Object.keys(value);
    if (!keys.length) return null;
    if (!keys.every((key) => /^\d+$/.test(key))) return null;

    return keys
        .map(Number)
        .sort((a, b) => a - b)
        .map((index) => value[String(index)])
        .map((char) => (typeof char === "string" ? char : ""))
        .join("");
};

/** Coerces any of the shapes above into the current block array. */
export const normalizeContentBlocks = (content: unknown): ContentBlock[] => {
    if (typeof content === "string") {
        return content.trim() ? [{ type: "text", content }] : [];
    }

    if (!Array.isArray(content)) return [];

    const blocks: ContentBlock[] = [];

    for (const raw of content) {
        if (typeof raw === "string") {
            if (raw.trim()) blocks.push({ type: "text", content: raw });
            continue;
        }

        if (!raw || typeof raw !== "object") continue;

        const block = raw as Record<string, unknown>;

        if (typeof block.content === "string") {
            if (!block.content.trim()) continue;
            blocks.push({
                type: block.type === "image" ? "image" : "text",
                content: block.content,
            });
            continue;
        }

        const rebuilt = stringFromCharMap(block);
        if (rebuilt?.trim()) blocks.push({ type: "text", content: rebuilt });
    }

    return blocks;
};

/** Turns the entities the editor emits back into characters, so plain-text
 *  previews read as text and not as `&quot;markup&quot;`. */
const decodeEntities = (value: string): string =>
    value
      .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
        const named: Record<string, string> = {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          apos: "'",
          nbsp: " ",
        };
        if (entity.startsWith("#x") || entity.startsWith("#X")) {
          return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
        }
        if (entity.startsWith("#")) {
          return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
        }
        return named[entity.toLowerCase()] ?? match;
      })
      // &amp;quot; style double-encoding, one more pass.
      .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[
          entity.toLowerCase()
        ] ?? match,
      );

/**
 * Tidies the HTML `document.execCommand` produces in RichTextEditor.
 * Turning lines into a list yields `<p><ul>…</ul></p>` — a block element
 * inside a paragraph, which is invalid, so the browser splits it and leaves
 * two empty `<p>` behind that show up as stray vertical gaps.
 */
const unwrapBlockParagraphs = (html: string): string =>
    html
      .replace(
        /<p>\s*(<(ul|ol|blockquote|h[1-6]|figure|table|pre)\b[\s\S]*?<\/\2>)\s*<\/p>/gi,
        "$1",
      )
      .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");

/** One text block to the HTML RichTextEditor edits: pass the editor's own
 *  tags through untouched, render anything else as paragraphs. */
export const renderTextBlock = (value: string): string =>
    looksLikeHtml(value)
        ? unwrapBlockParagraphs(value)
        : renderCustomMarkup(value);

/** The `src` of a block that is *only* an image, or null if it carries any
 *  other content (an image sitting mid-sentence stays inline in the text). */
const standaloneImageSrc = (html: string): string | null => {
    if (html.replace(/<[^>]+>/g, "").trim()) return null;

    const images = html.match(/<img\b[^>]*>/gi) ?? [];
    if (images.length !== 1) return null;

    return images[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
};

/**
 * Splits a text section's HTML into one `content` entry per top-level
 * element, so each paragraph becomes its own block — the shape the API
 * models (Postman: a text block holds a single `<p>…</p>`).
 *
 * A block that is nothing but an image becomes an `image` block, which is
 * how an image inserted between two paragraphs in the editor survives the
 * round trip at exactly that position.
 */
const splitTopLevelBlocks = (html: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    // One balanced top-level element, a bare <img>, or a run of loose
    // inline content between them (wrapped in a <p> below).
    const pattern =
        /<img\b[^>]*\/?>|<(p|h[1-6]|ul|ol|blockquote|figure|table|pre)\b[^>]*>[\s\S]*?<\/\1>|[^<]+|<[^>]+>/gi;

    let loose = "";
    const flushLoose = () => {
        if (loose.trim()) blocks.push({ type: "text", content: `<p>${loose.trim()}</p>` });
        loose = "";
    };

    const pushBlock = (html: string) => {
        const src = standaloneImageSrc(html);
        if (src) {
            blocks.push({ type: "image", content: src });
            return;
        }
        if (html.replace(/<[^>]+>/g, "").trim() || /<(img|br|hr)\b/i.test(html)) {
            blocks.push({ type: "text", content: html });
        }
    };

    for (const match of html.match(pattern) ?? []) {
        if (/^<(img|p|h[1-6]|ul|ol|blockquote|figure|table|pre)\b/i.test(match)) {
            flushLoose();
            pushBlock(match);
        } else {
            loose += match;
        }
    }
    flushLoose();

    return blocks;
};

const escapeAttribute = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Converts a fetched post's `content` field into editable sections.
 *
 * Everything flows into a single RichTextEditor: consecutive text blocks are
 * joined, and image blocks are inlined as `<img>` at their position in that
 * flow. The array stays per-paragraph on the wire, but the editor shows one
 * continuous document — which is the only way an author can put the caret
 * between two paragraphs and drop an image there.
 */
export const contentToSections = (content: unknown): Section[] => {
    const sections: Section[] = [];

    for (const block of normalizeContentBlocks(content)) {
        const html =
            block.type === "image"
                ? `<p><img src="${escapeAttribute(block.content)}" alt="" /></p>`
                : renderTextBlock(block.content);

        const previous = sections[sections.length - 1];

        if (previous?.type === "text") {
            previous.content += html;
        } else {
            sections.push(newTextSection(html));
        }
    }

    return sections.length ? sections : [newTextSection()];
};

/**
 * Converts editable sections back into the block array the backend expects:
 * one entry per paragraph for text, one per image, in document order.
 */
export const sectionsToContent = (sections: Section[]): ContentBlock[] =>
    sections
        .filter((section) => section.content?.trim())
        .flatMap((section) =>
            section.type === "image"
                ? [{ type: "image" as const, content: section.content }]
                : splitTopLevelBlocks(section.content),
        );

/** Plain-text preview for the blog list/detail views (BlogManagement.tsx). */
export const excerptFromContent = (content: unknown): string =>
    normalizeContentBlocks(content)
        .filter((block) => block.type === "text")
        .map((block) =>
            looksLikeHtml(block.content)
                ? decodeEntities(block.content.replace(/<[^>]+>/g, " "))
                : stripCustomMarkup(block.content),
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
