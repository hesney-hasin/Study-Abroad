import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors",
  {
    variants: {
      status: {
        eligible: "bg-success/15 text-success border border-success/30",
        borderline: "bg-warning/15 text-warning-foreground border border-warning/30",
        "not-eligible": "bg-destructive/15 text-destructive border border-destructive/30",
        high: "bg-success/15 text-success border border-success/30",
        medium: "bg-warning/15 text-warning-foreground border border-warning/30",
        low: "bg-destructive/15 text-destructive border border-destructive/30",
        info: "bg-info/15 text-info border border-info/30",
      },
    },
    defaultVariants: {
      status: "info",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, icon, className }, ref) => {
    return (
      <span ref={ref} className={cn(statusBadgeVariants({ status }), className)}>
        {icon}
        {children}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

// Helper function to get status label
export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    eligible: "Eligible",
    borderline: "Borderline",
    "not-eligible": "Not Eligible",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return labels[status] || status;
};
