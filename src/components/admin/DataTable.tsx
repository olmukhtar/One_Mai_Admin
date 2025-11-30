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
import { MoreHorizontal, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  showActions?: boolean;
  actionItems?: Array<{ label: string; onClick: (row: any) => void }>;
  currentPage?: number;
  totalPages?: number;
  totalEntries?: number;
  onPageChange?: (page: number) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  searchableFields?: string[];
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
  searchPlaceholder = "Search...",
  onSearch,
  loading = false,
  searchableFields = [],
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Handle search internally if no external search handler provided
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Internal search functionality
  const filteredData = useMemo(() => {
    if (!onSearch && searchQuery) {
      return data.filter((row) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        // Search through all columns or specified fields
        const fieldsToSearch = searchableFields.length > 0 
          ? searchableFields 
          : columns.map(col => col.key);

        return fieldsToSearch.some(field => {
          const value = row[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        });
      });
    }
    return data;
  }, [data, searchQuery, onSearch, columns, searchableFields]);

  const startEntry = (currentPage - 1) * 10 + 1;
  const endEntry = Math.min(currentPage * 10, totalEntries);
  const displayData = onSearch ? data : filteredData;
  const displayTotalEntries = onSearch ? totalEntries : displayData.length;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Maximum number of page buttons to show
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("...");
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">

        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-4 py-2"
          disabled={loading}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              {showActions && <TableHead className="w-[50px]">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading state
              <TableRow>
                <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayData.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No results found for your search." : "No data available."}
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              displayData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actionItems.map((item, itemIndex) => (
                            <DropdownMenuItem
                              key={itemIndex}
                              onClick={() => item.onClick(row)}
                            >
                              {item.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {startEntry} to {endEntry} of {displayTotalEntries} entries
          {searchQuery && !onSearch && (
            <span className="ml-2">(filtered from {data.length} total entries)</span>
          )}
        </p>
        
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="px-3"
          >
            ← Previous
          </Button>
          
          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, idx) => (
              pageNum === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum as number)}
                  disabled={loading}
                  className={`min-w-[40px] ${
                    pageNum === currentPage 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : ""
                  }`}
                >
                  {pageNum}
                </Button>
              )
            ))}
          </div>
          
          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="px-3"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}