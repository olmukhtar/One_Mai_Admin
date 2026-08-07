import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  subtitle?: string;
  loading?: boolean;
  className?: string;
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = "up",
  subtitle = "Live",
  loading = false,
  className,
  iconBg = "bg-brand/10 dark:bg-brand/20",
  iconColor = "text-brand dark:text-blue-400",
  onClick,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-brand/30",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Top subtle light accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
            iconBg,
            iconColor
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded",
              trendDirection === "up"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : trendDirection === "down"
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {trendDirection === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trendDirection === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {trend}
          </span>
        )}
        <span className="text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}
