import React from "react";
import { cn } from "@/lib/utils";
import { RaceStatus } from "@/types";

interface StatusBadgeProps {
  status: RaceStatus;
  className?: string;
}

const statusConfig: Record<RaceStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-accent/20 text-accent border-accent/30",
  },
  active: {
    label: "Active",
    className: "bg-success/20 text-success border-success/30",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  completed: {
    label: "Completed",
    className: "bg-muted text-muted-foreground border-muted-foreground/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        config.className,
        className
      )}
    >
      {status === "active" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
      )}
      {config.label}
    </span>
  );
};
