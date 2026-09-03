import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, Quote } from "lucide-react";
import { renderCustomMarkup } from "@/lib/customMarkup";
import { htmlToCustomMarkup } from "@/lib/richTextSerializer";

interface RichTextEditorProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

/**
 * A true WYSIWYG box: bold/italic/headings/lists/quotes/links show as
 * actual formatting while you type, not raw "**"/"#" characters. Backed by
 * contentEditable + execCommand — text still round-trips to the same
 * custom markup string (see customMarkup.ts) for storage, since the
 * backend strips real HTML tags on save.
 *
 * Not natively form-validatable (contentEditable has no `required`
 * attribute) — callers should check for empty content themselves before
 * submitting.
 */
export function RichTextEditor({ id, value, onChange, placeholder, minHeight = "420px" }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastSerialized = useRef<string>("");

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
        if (value === lastSerialized.current) return;
        el.innerHTML = renderCustomMarkup(value);
        lastSerialized.current = value;
    }, [value]);

    const emitChange = () => {
        const el = editorRef.current;
        if (!el) return;
        const markup = htmlToCustomMarkup(el);
        lastSerialized.current = markup;
        onChange(markup);
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
                    className="prose prose-sm max-w-none w-full rounded-md border border-input bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring overflow-y-auto [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_a]:text-blue-600 [&_a]:underline [&_p]:my-2"
                    style={{ minHeight }}
                />
            </div>
        </div>
    );
}
