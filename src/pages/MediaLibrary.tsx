import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MediaGrid } from "@/components/admin/MediaGrid";

export default function MediaLibrary() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Media Library"
                    breadcrumbs={[{ label: "Media Library" }]}
                    showSearch={false}
                    showExportButtons={false}
                />

                <Card className="border-slate-100 shadow-sm">
                    <CardContent className="pt-6">
                        <MediaGrid />
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
