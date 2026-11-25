import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, Quote, Image as ImageIcon } from "lucide-react";

interface RichTextEditorProps {
    id?: string;
    /** Real HTML (e.g. "<p>Stay open to GOD</p>") — the backend's post
     *  content blocks store this directly, unstripped. */
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
    /** Opens the media picker and resolves with the chosen image URL, or
     *  null if the author cancelled. Omit to hide the insert-image button. */
    onPickImage?: () => Promise<string | null>;
}

/**
 * A true WYSIWYG box: bold/italic/headings/lists/quotes/links show as
 * actual formatting while you type, not raw markup characters. Backed by
 * contentEditable + execCommand. `value`/`onChange` are plain HTML in and
 * out — one editor instance per `content` block (see CreateBlog/EditBlog).
 *
 * Not natively form-validatable (contentEditable has no `required`
 * attribute) — callers should check for empty content themselves before
 * submitting.
 */
export function RichTextEditor({ id, value, onChange, placeholder, minHeight = "420px", onPickImage }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastEmitted = useRef<string>("");
    // The caret is lost while the media dialog has focus, so remember where
    // it was — that position is where the image has to land.
    const savedRange = useRef<Range | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    useEffect(() => {
        try {
            document.execCommand("defaultParagraphSeparator", false, "p");
        } catch {
            // Best-effort — unsupported in some browsers, editor still works.
        }
    }, []);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        // Only touch the DOM when the incoming value didn't come from our
        // own last emit — otherwise every keystroke would reset the caret.
        if (value === lastEmitted.current) return;
        el.innerHTML = value || "";
        lastEmitted.current = value || "";
    }, [value]);

    const emitChange = () => {
        const el = editorRef.current;
        if (!el) return;
        const html = el.innerHTML;
        lastEmitted.current = html;
        onChange(html);
    };

    const rememberCaret = useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
            savedRange.current = range.cloneRange();
        }
    }, []);

    const restoreCaret = () => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();

        const selection = window.getSelection();
        if (!selection) return;

        selection.removeAllRanges();
        if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) {
            selection.addRange(savedRange.current);
            return;
        }
        // No usable caret (never focused, or content replaced) — append.
        const end = document.createRange();
        end.selectNodeContents(el);
        end.collapse(false);
        selection.addRange(end);
    };

    const handleInsertImage = async () => {
        if (!onPickImage) return;

        rememberCaret();
        const url = await onPickImage();
        if (!url) return;

        restoreCaret();
        // Its own paragraph, so postContent's splitter emits a standalone
        // `image` block rather than burying the <img> inside a text block.
        document.execCommand(
            "insertHTML",
            false,
            `<p><img src="${url.replace(/"/g, "&quot;")}" alt="" /></p>`,
        );
        emitChange();
    };

    /** The block element the caret sits in, scoped to this editor. */
    const blockAtCaret = (): HTMLElement | null => {
        const el = editorRef.current;
        const selection = window.getSelection();
        if (!el || !selection?.rangeCount) return null;

        let node: Node | null = selection.getRangeAt(0).startContainer;
        while (node && node !== el) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                if (/^(P|DIV|LI|BLOCKQUOTE|H[1-6]|PRE)$/.test(element.tagName)) return element;
            }
            node = node.parentNode;
        }
        return null;
    };

    /** True when nothing follows the caret inside `block`. */
    const caretAtEndOf = (block: HTMLElement): boolean => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return false;

        const after = selection.getRangeAt(0).cloneRange();
        after.selectNodeContents(block);
        after.setStart(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
        return after.toString().trim() === "";
    };

    /** Inserts `node` after whichever ancestor of `from` is a direct child of
     *  the editor, so we never nest a <p> inside another block. */
    const insertAfterTopLevel = (from: HTMLElement, node: HTMLElement) => {
        const el = editorRef.current;
        if (!el) return;

        let top: HTMLElement = from;
        while (top.parentElement && top.parentElement !== el) top = top.parentElement;
        top.parentNode?.insertBefore(node, top.nextSibling);
    };

    const placeCaretIn = (element: HTMLElement) => {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.setStart(element, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    /**
     * Enter inside a heading or a quote would otherwise carry that formatting
     * onto every following line, with no way back to normal text. Pressing
     * Enter at the end of such a block starts a plain paragraph after it, and
     * Enter on an empty list item leaves the list — the usual way out in any
     * editor.
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" || event.shiftKey) return;

        const block = blockAtCaret();
        if (!block) return;

        // Empty bullet -> drop out of the list. Done by hand rather than by
        // toggling execCommand's list command, which misbehaves when the list
        // sits inside the <p> wrapper execCommand itself produces.
        if (block.tagName === "LI") {
            if (block.textContent?.trim()) return; // a real item: normal Enter
            const list = block.closest("ul, ol");
            if (!list) return;

            event.preventDefault();
            block.remove();
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            insertAfterTopLevel(list, paragraph);
            if (!list.querySelector("li")) list.remove();
            placeCaretIn(paragraph);
            emitChange();
            return;
        }

        const quote = block.closest("blockquote");
        const exitFrom = quote ?? (/^H[1-6]$/.test(block.tagName) ? block : null);
        if (!exitFrom || !caretAtEndOf(exitFrom)) return;

        event.preventDefault();

        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        insertAfterTopLevel(exitFrom as HTMLElement, paragraph);
        placeCaretIn(paragraph);
        emitChange();
    };

    const exec = (command: string, arg?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, arg);
        emitChange();
    };

    // `window.prompt` blocks the whole tab and cannot be styled, so the URL is
    // collected in a real dialog. The caret is remembered first, because the
    // dialog's input steals focus away from the editor.
    const openLinkDialog = () => {
        rememberCaret();
        setLinkUrl("");
        setLinkDialogOpen(true);
    };

    const applyLink = () => {
        const url = linkUrl.trim();
        setLinkDialogOpen(false);
        if (!url) return;

        restoreCaret();
        document.execCommand("createLink", false, url);
        emitChange();
    };

    const isEmpty = !value || !value.trim();

    return (
        <div className="space-y-2">
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm w-fit">
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Bold" onClick={() => exec("bold")}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Italic" onClick={() => exec("italic")}>
                    <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Link" onClick={openLinkDialog}>
                    <LinkIcon className="h-4 w-4" />
                </Button>
                {onPickImage && (
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Image Here" onClick={handleInsertImage}>
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                )}
                <div className="w-px h-5 bg-slate-200 mx-1 self-center" />
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Heading 1" onClick={() => exec("formatBlock", "<h1>")}>
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Heading 2" onClick={() => exec("formatBlock", "<h2>")}>
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="List" onClick={() => exec("insertUnorderedList")}>
                    <List className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Quote" onClick={() => exec("formatBlock", "<blockquote>")}>
                    <Quote className="h-4 w-4" />
                </Button>
            </div>

            <div className="relative">
                {isEmpty && placeholder && (
                    <p className="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none">{placeholder}</p>
                )}
                <div
                    id={id}
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={emitChange}
                    onBlur={emitChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={rememberCaret}
                    onMouseUp={rememberCaret}
                    className="prose prose-sm max-w-none w-full rounded-md border border-input bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring overflow-y-auto [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_a]:text-blue-600 [&_a]:underline [&_p]:my-2 [&_img]:my-3 [&_img]:max-h-80 [&_img]:rounded-lg"
                    style={{ minHeight }}
                />
            </div>

            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Insert link</DialogTitle>
                    </DialogHeader>
                    <Input
                        autoFocus
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                applyLink();
                            }
                        }}
                        placeholder="https://example.com"
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={applyLink} disabled={!linkUrl.trim()}>
                            Add link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
