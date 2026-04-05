import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Trophy, Calendar, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRaceEvents } from "@/services/eventsService";
import type { RaceEvent } from "@/services/eventsService";

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [races, setRaces] = useState<RaceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getRaceEvents()
      .then(setRaces)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filteredRaces = useMemo(() => {
    if (!searchQuery) return races;
    const query = searchQuery.toLowerCase();
    return races.filter(
      (race) =>
        (race.track_name ?? "").toLowerCase().includes(query) ||
        race.host_username.toLowerCase().includes(query) ||
        race.participants.some((p) =>
          (p.umamusume_data?.name ?? "").toLowerCase().includes(query)
        )
    );
  }, [searchQuery, races]);

  const racesByStatus = useMemo(() => ({
    all: filteredRaces,
    scheduled: filteredRaces.filter((r) => r.status === "scheduled"),
    open: filteredRaces.filter((r) => r.status === "open"),
    active: filteredRaces.filter((r) => r.status === "active" || r.status === "race_ongoing"),
    completed: filteredRaces.filter((r) => r.status === "completed"),
  }), [filteredRaces]);

  const stats = {
    active: racesByStatus.active.length,
    totalBids: filteredRaces.reduce((acc, r) => acc + r.bid_count, 0),
    runners: filteredRaces.reduce((acc, r) => acc + r.participants.length, 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-10 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            Welcome to <span className="text-gradient">UmaBet</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Place your bets on your favorite Umamusumes and watch them race to glory!
          </p>
        </section>

        {/* Stats */}
        <section className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-sm">
            <div className="p-3 rounded-xl gradient-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active Races</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-sm">
            <div className="p-3 rounded-xl gradient-gold">
              <Trophy className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalBids}</p>
              <p className="text-sm text-muted-foreground">Total Bets</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-sm">
            <div className="p-3 rounded-xl bg-secondary">
              <Calendar className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.runners}</p>
              <p className="text-sm text-muted-foreground">Enrolled Runners</p>
            </div>
          </div>
        </section>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-6 p-4 rounded-lg bg-secondary/50">
            <p className="text-sm">
              Showing results for: <span className="font-semibold">"{searchQuery}"</span>
              {" · "}
              <span className="text-muted-foreground">{filteredRaces.length} races found</span>
            </p>
          </div>
        )}

        {/* Race Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="w-full justify-start bg-secondary/50 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All ({racesByStatus.all.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({racesByStatus.scheduled.length})</TabsTrigger>
            <TabsTrigger value="open" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-accent"></span>
              Open ({racesByStatus.open.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Active ({racesByStatus.active.length})
            </TabsTrigger>
            <TabsTrigger value="completed">Completed ({racesByStatus.completed.length})</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading races...</div>
          ) : (
            (["all", "scheduled", "open", "active", "completed"] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                {racesByStatus[tab].length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {racesByStatus[tab].map((race, index) => (
                      <div
                        key={race.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <EventCard race={race} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No {tab === "all" ? "" : tab} races found.</p>
                  </div>
                )}
              </TabsContent>
            ))
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Home;
