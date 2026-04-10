import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Trophy, ArrowRight, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { RaceEvent } from "@/services/eventsService";
import { format } from "date-fns";

interface EventCardProps {
  race: RaceEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ race }) => {
  const isOpen = race.status === "open";
  const isCompleted = race.status === "completed";
  const isScheduled = race.status === "scheduled";

  const winner = isCompleted
    ? race.participants.find((p) => p.place === 1)
    : null;

  const title = race.track_name ?? `Race #${race.id}`;
  const dateStr = race.opening_dt ?? race.created_at;

  const ctaLabel = isOpen ? "Place Bet" : isScheduled ? "Enroll Uma" : "View Race";
  const ctaVariant: "default" | "gold" | "secondary" = isOpen ? "gold" : isScheduled ? "default" : "secondary";

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h3 className="text-lg font-display font-bold group-hover:text-primary transition-colors line-clamp-1">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {race.track_name ? `${race.track_name}` : "No track assigned"}
            </p>
          </div>
          <StatusBadge status={race.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Winner banner or participant avatars */}
        {isCompleted && winner ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Trophy className="h-5 w-5 text-accent shrink-0" />
            <Avatar className="border-2 border-accent h-10 w-10 shrink-0">
              <AvatarImage src={winner.umamusume_data?.avatar_url ?? undefined} alt={winner.umamusume_data?.name} />
              <AvatarFallback className="text-xs bg-accent/10 text-accent">
                {(winner.umamusume_data?.name ?? "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Winner</p>
              <p className="font-semibold text-sm truncate">{winner.umamusume_data?.name ?? "Unknown"}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {race.participants.length > 0 ? (
              <>
                <div className="flex -space-x-2">
                  {race.participants.slice(0, 4).map((p) => (
                    <Avatar key={p.id} className="border-2 border-card h-9 w-9">
                      <AvatarImage src={p.umamusume_data?.avatar_url ?? undefined} alt={p.umamusume_data?.name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(p.umamusume_data?.name ?? "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {race.participants.length > 4 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-semibold">
                      +{race.participants.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{race.participants.length} runners</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No runners yet</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>by {race.host_username}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(dateStr), "MMM d, HH:mm")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{race.bid_count} bets</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild variant={ctaVariant} className="w-full group/btn">
          <Link to={`/race/${race.id}`}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
