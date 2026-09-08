import { useCallback, useRef, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
    title: string;
    description?: string;
    /** Label on the confirming button. Defaults to "Confirm". */
    confirmLabel?: string;
    cancelLabel?: string;
    /** Styles the action button as destructive. Defaults to true — nearly
     *  every caller is a delete. */
    destructive?: boolean;
}

/**
 * A drop-in replacement for `window.confirm`, as a real dialog.
 *
 * `confirm()` and `prompt()` block the browser's main thread: the tab stops
 * responding to anything until the modal is dismissed, they cannot be styled,
 * and some embedded contexts suppress them entirely — leaving a button that
 * silently does nothing.
 *
 * Usage mirrors the native call, so the calling code barely changes:
 *
 *     const { confirm, dialog } = useConfirm();
 *     ...
 *     if (!(await confirm({ title: "Delete this post?" }))) return;
 *     ...
 *     return (<>{dialog}...</>);
 */
export function useConfirm() {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((confirmed: boolean) => void) | null>(null);

    const confirm = useCallback((next: ConfirmOptions) => {
        setOptions(next);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const settle = (confirmed: boolean) => {
        resolver.current?.(confirmed);
        resolver.current = null;
        setOptions(null);
    };

    const dialog = (
        <AlertDialog
            open={options !== null}
            // Covers Escape and overlay clicks as well as the buttons, so the
            // promise is never left hanging.
            onOpenChange={(open) => {
                if (!open) settle(false);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{options?.title}</AlertDialogTitle>
                    {options?.description && (
                        <AlertDialogDescription>{options.description}</AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => settle(false)}>
                        {options?.cancelLabel ?? "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => settle(true)}
                        className={
                            options?.destructive === false
                                ? undefined
                                : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                        }
                    >
                        {options?.confirmLabel ?? "Confirm"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return { confirm, dialog };
}
