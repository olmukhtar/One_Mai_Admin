import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  X,
  SlidersHorizontal,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  showActions?: boolean;
  actionItems?: Array<{
    label: string;
    onClick: (row: any) => void;
    show?: (row: any) => boolean;
    disabled?: (row: any) => boolean;
  }>;
  currentPage?: number;
  totalPages?: number;
  totalEntries?: number;
  onPageChange?: (page: number) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  searchableFields?: string[];
  // Selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  isRowSelectable?: (row: any) => boolean;
  getRowId?: (row: any) => string;
  // Bulk Actions
  bulkActions?: Array<{
    label: string;
    onClick: (selectedRows: any[]) => void;
    variant?: "default" | "destructive" | "outline";
  }>;
}

export function DataTable({
  columns,
  data,
  showActions = true,
  actionItems = [
    { label: "Edit", onClick: () => {} },
    { label: "Delete", onClick: () => {} },
  ],
  currentPage = 1,
  totalPages = 1,
  totalEntries = data.length,
  onPageChange = () => {},
  searchPlaceholder = "Search records...",
  onSearch,
  loading = false,
  searchableFields = [],
  selectable = false,
  selectedIds = [],
  onSelectedIdsChange = () => {},
  isRowSelectable,
  getRowId,
  bulkActions = [],
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useState<"compact" | "normal" | "spacious">("normal");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const filteredData = useMemo(() => {
    if (!onSearch && searchQuery) {
      return data.filter((row) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const fieldsToSearch =
          searchableFields.length > 0 ? searchableFields : columns.map((col) => col.key);

        return fieldsToSearch.some((field) => {
          const value = row[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        });
      });
    }
    return data;
  }, [data, searchQuery, onSearch, columns, searchableFields]);

  const displayData = onSearch ? data : filteredData;
  const displayTotalEntries = onSearch ? totalEntries : displayData.length;
  const startEntry = Math.min((currentPage - 1) * 10 + 1, displayTotalEntries);
  const endEntry = Math.min(currentPage * 10, displayTotalEntries);

  const selectableOnPage = useMemo(() => {
    return displayData.filter((row) => !isRowSelectable || isRowSelectable(row));
  }, [displayData, isRowSelectable]);

  const isAllSelected = useMemo(() => {
    if (selectableOnPage.length === 0) return false;
    return selectableOnPage.every((row) => {
      const rowId = getRowId ? getRowId(row) : row._id || row.id || "";
      return selectedIds.includes(rowId);
    });
  }, [selectableOnPage, selectedIds, getRowId]);

  const handleSelectAll = (checked: boolean) => {
    const pageIds = selectableOnPage.map((row) =>
      getRowId ? getRowId(row) : row._id || row.id || ""
    );
    if (checked) {
      const newSelectedIds = [
        ...selectedIds,
        ...pageIds.filter((id) => !selectedIds.includes(id)),
      ];
      onSelectedIdsChange(newSelectedIds);
    } else {
      const newSelectedIds = selectedIds.filter((id) => !pageIds.includes(id));
      onSelectedIdsChange(newSelectedIds);
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...selectedIds, rowId]);
    } else {
      onSelectedIdsChange(selectedIds.filter((id) => id !== rowId));
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const rowPadding = {
    compact: "py-2 text-xs",
    normal: "py-3.5 text-sm",
    spacious: "py-5 text-sm",
  }[density];

  const selectedRowsObjects = useMemo(() => {
    return data.filter((row) => {
      const id = getRowId ? getRowId(row) : row._id || row.id || "";
      return selectedIds.includes(id);
    });
  }, [data, selectedIds, getRowId]);

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Search + Density Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-9 py-2 rounded-xl bg-card border-border/80 focus:border-brand transition-colors text-sm"
            disabled={loading}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Density Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-medium"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Density
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setDensity("compact")}>
                Compact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDensity("normal")}>
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDensity("spacious")}>
                Spacious
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-border/60">
                {selectable && (
                  <TableHead className="w-[48px] px-4">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5"
                  >
                    {column.label}
                  </TableHead>
                ))}
                {showActions && (
                  <TableHead className="w-[60px] text-right pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Action
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Shimmer Loading Skeletons
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index} className="border-border/40">
                    {selectable && (
                      <TableCell className="px-4">
                        <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={rowPadding}>
                        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      </TableCell>
                    ))}
                    {showActions && (
                      <TableCell className="pr-4 text-right">
                        <div className="h-6 w-6 ml-auto rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : displayData.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length + (showActions ? 1 : 0) + (selectable ? 1 : 0)
                    }
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-foreground">No records found</p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery
                          ? "Try modifying your search keywords or active filters."
                          : "No entries available at the moment."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Rows
                displayData.map((row, index) => {
                  const rowId = getRowId
                    ? getRowId(row)
                    : row._id || row.id || String(index);
                  const isSelected = selectedIds.includes(rowId);
                  const isSelectable = !isRowSelectable || isRowSelectable(row);

                  return (
                    <TableRow
                      key={rowId}
                      className={cn(
                        "transition-colors hover:bg-brand/5 border-border/40 group",
                        isSelected && "bg-brand/10 dark:bg-brand/20 hover:bg-brand/15"
                      )}
                    >
                      {selectable && (
                        <TableCell className="w-[48px] px-4">
                          <Checkbox
                            checked={isSelected}
                            disabled={!isSelectable}
                            onCheckedChange={(checked) =>
                              handleSelectRow(rowId, !!checked)
                            }
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell key={column.key} className={rowPadding}>
                          {column.render
                            ? column.render(row[column.key], row)
                            : row[column.key]}
                        </TableCell>
                      ))}
                      {showActions && (
                        <TableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {actionItems
                                .filter((item) => !item.show || item.show(row))
                                .map((item, itemIndex) => (
                                  <DropdownMenuItem
                                    key={itemIndex}
                                    onClick={() => item.onClick(row)}
                                    disabled={
                                      item.disabled ? item.disabled(row) : false
                                    }
                                    className="cursor-pointer text-xs"
                                  >
                                    {item.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Floating Bulk Bar */}
      {selectable && selectedIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pl-2 text-xs font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-brand" />
            <span>{selectedIds.length} item(s) selected</span>
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant || "default"}
                onClick={() => action.onClick(selectedRowsObjects)}
                className="h-8 rounded-lg text-xs"
              >
                {action.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectedIdsChange([])}
              className="h-8 rounded-lg text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        <p className="text-xs text-muted-foreground font-medium">
          Showing {displayTotalEntries === 0 ? 0 : startEntry} to {endEntry} of{" "}
          {displayTotalEntries} entries
          {searchQuery && !onSearch && (
            <span className="ml-1 opacity-80">(filtered from {data.length})</span>
          )}
        </p>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="h-8 px-2.5 rounded-lg border-border/80 text-xs font-medium"
          >
            Previous
          </Button>

          {getPageNumbers().map((pageNum, idx) =>
            pageNum === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-xs text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum as number)}
                disabled={loading}
                className={cn(
                  "h-8 min-w-[32px] rounded-lg text-xs font-medium",
                  pageNum === currentPage
                    ? "bg-brand text-white hover:bg-brand-hover shadow-sm"
                    : "border-border/80"
                )}
              >
                {pageNum}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="h-8 px-2.5 rounded-lg border-border/80 text-xs font-medium"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}