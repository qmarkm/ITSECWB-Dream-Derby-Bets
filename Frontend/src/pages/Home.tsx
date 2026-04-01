import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Trophy, Calendar, Zap, Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { CreateEventModal } from "@/components/CreateEventModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockRaces } from "@/data/mockData";
import { Race } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { user } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [races, setRaces] = useState<Race[]>(mockRaces);

  const filteredRaces = useMemo(() => {
    if (!searchQuery) return races;
    const query = searchQuery.toLowerCase();
    return races.filter(
      (race) =>
        race.name.toLowerCase().includes(query) ||
        race.description.toLowerCase().includes(query) ||
        race.umamusumes.some((uma) => uma.name.toLowerCase().includes(query))
    );
  }, [searchQuery, races]);

  const racesByStatus = useMemo(() => {
    return {
      all: filteredRaces,
      open: filteredRaces.filter((r) => r.status === "open"),
      active: filteredRaces.filter((r) => r.status === "active"),
      upcoming: filteredRaces.filter((r) => r.status === "upcoming"),
      completed: filteredRaces.filter((r) => r.status === "completed"),
    };
  }, [filteredRaces]);

  const handleCreateEvent = (event: { name: string; description: string; scheduledAt: Date }) => {
    const newRace: Race = {
      id: `race-${Date.now()}`,
      name: event.name,
      description: event.description,
      status: "open",
      createdBy: user?.username || "Unknown",
      umamusumes: [],
      bets: [],
      createdAt: new Date(),
      scheduledAt: event.scheduledAt,
    };
    setRaces((prev) => [newRace, ...prev]);
    toast.success("Race created! Others can now add their Umamusumes.");
  };

  const stats = {
    active: racesByStatus.active.length,
    totalBets: filteredRaces.reduce((acc, r) => acc + r.bets.length, 0),
    runners: [...new Set(filteredRaces.flatMap((r) => r.umamusumes.map((u) => u.id)))].length,
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
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button variant="hero" size="lg" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create New Race
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/umas">
                <Trophy className="h-5 w-5 mr-2" />
                Browse Umas
              </Link>
            </Button>
          </div>
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
              <p className="text-2xl font-bold">{stats.totalBets}</p>
              <p className="text-sm text-muted-foreground">Total Bets</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-sm">
            <div className="p-3 rounded-xl bg-secondary">
              <Calendar className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.runners}</p>
              <p className="text-sm text-muted-foreground">Umamusumes</p>
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
            <TabsTrigger value="all" className="gap-2">
              All ({racesByStatus.all.length})
            </TabsTrigger>
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
            <TabsTrigger value="upcoming">Upcoming ({racesByStatus.upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({racesByStatus.completed.length})</TabsTrigger>
          </TabsList>

          {(["all", "open", "active", "upcoming", "completed"] as const).map((tab) => (
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
          ))}
        </Tabs>
      </main>

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreate={handleCreateEvent}
      />
    </div>
  );
};

export default Home;
