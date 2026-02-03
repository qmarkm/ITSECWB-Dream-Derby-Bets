import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Umamusume } from "@/types";
import { cn } from "@/lib/utils";

interface UmamusumeCardProps {
  umamusume: Umamusume;
  isSelected?: boolean;
  canBet?: boolean;
  onSelect?: (uma: Umamusume) => void;
}

export const UmamusumeCard: React.FC<UmamusumeCardProps> = ({
  umamusume,
  isSelected,
  canBet = true,
  onSelect,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50",
        canBet && "cursor-pointer"
      )}
      onClick={() => canBet && onSelect?.(umamusume)}
    >
      <Avatar className="h-16 w-16 border-2 border-primary/20">
        <AvatarImage src={umamusume.picture} alt={umamusume.name} className="object-cover" />
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
          {umamusume.name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h4 className="font-display font-semibold text-lg truncate">{umamusume.name}</h4>
        <p className="text-sm text-muted-foreground">Owner: {umamusume.owner}</p>
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground mb-1">Odds</div>
        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-accent/20 text-accent-foreground font-bold">
          x{umamusume.odds.toFixed(1)}
        </div>
      </div>

      {canBet && (
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(umamusume);
          }}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      )}
    </div>
  );
};
