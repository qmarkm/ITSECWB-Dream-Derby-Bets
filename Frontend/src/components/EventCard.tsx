import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Trophy, ArrowRight, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Race } from "@/types";
import { format } from "date-fns";

interface EventCardProps {
  race: Race;
}

export const EventCard: React.FC<EventCardProps> = ({ race }) => {
  const canBet = race.status === "active" || race.status === "upcoming";
  const isOpen = race.status === "open";
  const isCompleted = race.status === "completed";
  const winner = isCompleted && race.winnerId 
    ? race.umamusumes.find((u) => u.id === race.winnerId) 
    : null;

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-display font-bold group-hover:text-primary transition-colors line-clamp-1">
              {race.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {race.description}
            </p>
          </div>
          <StatusBadge status={race.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Winner Banner for Completed Races OR Umamusume Avatars for Others */}
        {isCompleted && winner ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Trophy className="h-5 w-5 text-accent" />
            <Avatar className="border-2 border-accent h-10 w-10">
              <AvatarImage src={winner.picture} alt={winner.name} />
              <AvatarFallback className="text-xs bg-accent/10 text-accent">
                {winner.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Winner</p>
              <p className="font-semibold text-sm">{winner.name}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {race.umamusumes.slice(0, 4).map((uma) => (
                <Avatar key={uma.id} className="border-2 border-card h-9 w-9">
                  <AvatarImage src={uma.picture} alt={uma.name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {uma.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {race.umamusumes.length > 4 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-semibold">
                  +{race.umamusumes.length - 4}
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {race.umamusumes.length} runners
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>by {race.createdBy}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(race.scheduledAt || race.createdAt, "MMM d, HH:mm")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{race.bets.length} bets</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild variant={isOpen ? "gold" : canBet ? "default" : "secondary"} className="w-full group/btn">
          <Link to={`/race/${race.id}`}>
            {isOpen ? "Add Umamusume" : canBet ? "Place Bet" : "View Details"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
