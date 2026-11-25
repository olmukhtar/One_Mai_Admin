import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  variant?: "success" | "warning" | "destructive" | "info" | "secondary";
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  variant,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const label = status == null || status === "" ? "—" : String(status);
  const normalized = label.toLowerCase();

  const getVariant = (): "success" | "warning" | "destructive" | "info" | "secondary" => {
    if (variant) return variant;
    if (
      normalized.includes("verified") ||
      normalized.includes("active") ||
      normalized.includes("completed") ||
      normalized.includes("successful") ||
      normalized.includes("approved") ||
      normalized.includes("published") ||
      normalized.includes("success")
    ) {
      return "success";
    }

    if (
      normalized.includes("pending") ||
      normalized.includes("in_progress") ||
      normalized.includes("review") ||
      normalized.includes("draft")
    ) {
      return "warning";
    }

    if (
      normalized.includes("failed") ||
      normalized.includes("rejected") ||
      normalized.includes("suspended") ||
      normalized.includes("inactive") ||
      normalized.includes("cancelled")
    ) {
      return "destructive";
    }

    if (
      normalized.includes("processing") ||
      normalized.includes("assigned") ||
      normalized.includes("open")
    ) {
      return "info";
    }

    return "secondary";
  };

  const actualVariant = getVariant();

  const styles = {
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
    destructive:
      "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40",
    info:
      "bg-blue-50 text-brand border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40",
    secondary:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    destructive: "bg-rose-500",
    info: "bg-brand",
    secondary: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide transition-colors",
        styles[actualVariant],
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColors[actualVariant]
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              dotColors[actualVariant]
            )}
          />
        </span>
      )}
      {label}
    </span>
  );
}