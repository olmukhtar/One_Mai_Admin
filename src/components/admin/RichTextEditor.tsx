import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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

    const exec = (command: string, arg?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, arg);
        emitChange();
    };

    const handleLink = () => {
        const url = window.prompt("Link URL (e.g. https://example.com)");
        if (!url) return;
        exec("createLink", url);
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
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Link" onClick={handleLink}>
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
                    onKeyUp={rememberCaret}
                    onMouseUp={rememberCaret}
                    className="prose prose-sm max-w-none w-full rounded-md border border-input bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring overflow-y-auto [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_a]:text-blue-600 [&_a]:underline [&_p]:my-2 [&_img]:my-3 [&_img]:max-h-80 [&_img]:rounded-lg"
                    style={{ minHeight }}
                />
            </div>
        </div>
    );
}
