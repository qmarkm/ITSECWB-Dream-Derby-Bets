import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bet, Umamusume } from "@/types";
import { format } from "date-fns";
import { Coins } from "lucide-react";

interface BetsListProps {
  bets: Bet[];
  umamusumes: Umamusume[];
}

export const BetsList: React.FC<BetsListProps> = ({ bets, umamusumes }) => {
  if (bets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No bets placed yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bets.map((bet, index) => {
        const uma = umamusumes.find((u) => u.id === bet.umamusumeId);
        
        return (
          <div
            key={bet.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarImage src={uma?.picture} alt={bet.umamusumeName} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {bet.umamusumeName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{bet.username}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary font-medium truncate">{bet.umamusumeName}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(bet.createdAt, "MMM d, HH:mm")}
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent-foreground font-semibold">
              <Coins className="h-4 w-4" />
              {bet.amount.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
};
