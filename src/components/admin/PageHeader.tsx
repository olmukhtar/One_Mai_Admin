import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download, FileSpreadsheet } from "lucide-react";

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showExportButtons?: boolean;
  rightSlot?: React.ReactNode;
}

export function PageHeader({
  title,
  breadcrumbs = [],
  showSearch = false,
  searchPlaceholder = "Search...",
  showExportButtons = false,
  rightSlot
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-primary">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="mx-2">/</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title and Right Slot */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {rightSlot}
      </div>

      {/* Search and Export */}
      {(showSearch || showExportButtons) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">


          {showExportButtons && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}