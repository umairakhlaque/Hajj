import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "gold" | "success" | "warning";
  delay?: number;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const variantStyles = {
    default: "border-white/8 bg-surface-700/50",
    gold: "border-gold-500/20 bg-gold-500/5",
    success: "border-emerald-500/20 bg-emerald-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
  };

  const iconStyles = {
    default: "bg-vault-600/20 text-vault-400",
    gold: "bg-gold-500/20 text-gold-400",
    success: "bg-emerald-500/20 text-emerald-400",
    warning: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200 hover:border-white/15",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend.value > 0
                ? "bg-emerald-500/10 text-emerald-400"
                : trend.value < 0
                ? "bg-red-500/10 text-red-400"
                : "bg-white/5 text-white/40"
            )}
          >
            {trend.value > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend.value < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-sm text-white/50 mt-0.5">{title}</p>
      {description && (
        <p className="text-xs text-white/30 mt-2">{description}</p>
      )}
    </div>
  );
}
