import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaGrid } from "@/components/admin/MediaGrid";
import type { MediaItem } from "@/lib/media";

interface MediaPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (item: MediaItem) => void;
    selectedUrl?: string;
}

export function MediaPickerDialog({ open, onOpenChange, onSelect, selectedUrl }: MediaPickerDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Media</DialogTitle>
                </DialogHeader>
                <MediaGrid
                    selectedUrl={selectedUrl}
                    onSelect={(item) => {
                        onSelect(item);
                        onOpenChange(false);
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
