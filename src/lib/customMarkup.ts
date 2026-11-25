/**
 * A small, deliberately non-HTML markup for blog content.
 *
 * The backend strips real HTML tags out of the `content` field on save, so
 * formatting has to survive as plain text. This syntax has no `<`/`>`
 * characters, so it passes through untouched, and is rendered to HTML only
 * client-side (here for the editor preview, and again on the public site).
 *
 * Syntax:
 *   **bold**        -> <strong>
 *   *italic*         -> <em>
 *   # Heading        -> <h1>   (must start the line)
 *   ## Subheading    -> <h2>   (must start the line)
 *   > Quote          -> <blockquote> (must start the line)
 *   - List item      -> <li>, consecutive "- " lines become one <ul>
 *   [text](url)      -> <a href="url">
 *
 * Website twin: Website/lib/customMarkup.ts — keep both in sync.
 */

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const renderInline = (raw: string): string => {
    let text = escapeHtml(raw);
    text = text.replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        (_match, label: string, url: string) =>
            `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    );
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return text;
};

export const renderCustomMarkup = (content: string): string => {
    if (!content) return "";

    const blocks = content
        .split(/\r?\n\r?\n+/)
        .map((block) => block.trim())
        .filter(Boolean);

    return blocks
        .map((block) => {
            const lines = block
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

            if (lines.length && lines.every((line) => line.startsWith("- "))) {
                const items = lines.map((line) => `<li>${renderInline(line.slice(2))}</li>`).join("");
                return `<ul>${items}</ul>`;
            }

            if (block.startsWith("## ")) {
                return `<h2>${renderInline(block.slice(3).replace(/\r?\n/g, " "))}</h2>`;
            }

            if (block.startsWith("# ")) {
                return `<h1>${renderInline(block.slice(2).replace(/\r?\n/g, " "))}</h1>`;
            }

            if (block.startsWith("> ")) {
                const quoted = lines.map((line) => line.replace(/^>\s?/, "")).join("<br />");
                return `<blockquote>${renderInline(quoted)}</blockquote>`;
            }

            return `<p>${renderInline(block).replace(/\r?\n/g, "<br />")}</p>`;
        })
        .join("");
};

/** Plain-text preview (blog list cards, `<title>` meta, etc). */
export const stripCustomMarkup = (content: string): string =>
    (content || "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/^#{1,2}\s+/gm, "")
        .replace(/^>\s?/gm, "")
        .replace(/^-\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim();
