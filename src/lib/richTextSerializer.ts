/**
 * Converts the WYSIWYG editor's live DOM (built by execCommand) back into
 * the custom markup syntax used for storage. Twin of `renderCustomMarkup`
 * in customMarkup.ts, which does the reverse — the editor calls that to
 * build the DOM when loading a post, and this to serialize edits back out.
 *
 * Assumes `defaultParagraphSeparator` is set to "p", so top-level children
 * of the editable root are always one of: P, H1, H2, UL, BLOCKQUOTE.
 */

const processInline = (node: ChildNode): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const inner = Array.from(el.childNodes).map(processInline).join("");

    switch (el.tagName) {
        case "B":
        case "STRONG":
            return inner.trim() ? `**${inner}**` : inner;
        case "I":
        case "EM":
            return inner.trim() ? `*${inner}*` : inner;
        case "A":
            return `[${inner}](${el.getAttribute("href") || ""})`;
        case "BR":
            return "\n";
        default:
            return inner;
    }
};

const processBlock = (el: HTMLElement): string => {
    switch (el.tagName) {
        case "H1":
            return `# ${processInline(el).trim()}`;
        case "H2":
            return `## ${processInline(el).trim()}`;
        case "BLOCKQUOTE": {
            const text = Array.from(el.childNodes).map(processInline).join("").trim();
            return text
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
        }
        case "UL":
        case "OL": {
            const items = Array.from(el.children).filter((c) => c.tagName === "LI");
            return items.map((li) => `- ${processInline(li as HTMLElement).trim()}`).join("\n");
        }
        default:
            return processInline(el).trim();
    }
};

export const htmlToCustomMarkup = (root: HTMLElement): string => {
    const blocks: string[] = [];

    for (const node of Array.from(root.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || "").trim();
            if (text) blocks.push(text);
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const el = node as HTMLElement;
        if (el.tagName === "BR") continue;

        const text = processBlock(el);
        if (text.trim()) blocks.push(text);
    }

    return blocks.join("\n\n");
};
