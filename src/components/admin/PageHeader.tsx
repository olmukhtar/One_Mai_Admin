import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileText, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showExportButtons?: boolean;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  rightSlot?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  showExportButtons = false,
  onExportPdf,
  onExportCsv,
  onExportExcel,
  rightSlot,
}: PageHeaderProps) {
  return (
    <div className="space-y-3 pb-2">
      {/* Breadcrumbs Navigation */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Link to="/dashboard" className="hover:text-brand transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-brand transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-semibold">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {showExportButtons && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCsv}
                className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-medium"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExcel}
                className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPdf}
                className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-medium"
              >
                <FileText className="h-3.5 w-3.5 text-rose-600" />
                PDF
              </Button>
            </div>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}