import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string; pulse?: boolean }> = {
  // Backend statuses
  scheduled: {
    label: "Enrolling Runners",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  open: {
    label: "Bets Open",
    className: "bg-accent/20 text-accent border-accent/30",
  },
  active: {
    label: "Bets Closed",
    className: "bg-success/20 text-success border-success/30",
    pulse: true,
  },
  race_ongoing: {
    label: "Racing",
    className: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
    pulse: true,
  },
  completed: {
    label: "Finished",
    className: "bg-muted text-muted-foreground border-muted-foreground/30",
  },
  // Legacy / fallback
  upcoming: {
    label: "Upcoming",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
};

const fallback = {
  label: "Unknown",
  className: "bg-muted text-muted-foreground border-muted-foreground/30",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] ?? { ...fallback, label: status };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        config.className,
        className
      )}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {config.label}
    </span>
  );
};
