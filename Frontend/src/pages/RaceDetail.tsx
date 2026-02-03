import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users, Trophy, Clock, Info, Plus, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { UmamusumeCard } from "@/components/UmamusumeCard";
import { BetModal } from "@/components/BetModal";
import { BetsList } from "@/components/BetsList";
import { AddUmamusumeModal } from "@/components/AddUmamusumeModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockRaces } from "@/data/mockData";
import { Umamusume, Bet, Race } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

const RaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  
  const [selectedUma, setSelectedUma] = useState<Umamusume | null>(null);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [addUmaModalOpen, setAddUmaModalOpen] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [umamusumes, setUmamusumes] = useState<Umamusume[]>([]);
  const [raceData, setRaceData] = useState<Race | null>(null);

  const race = useMemo(() => {
    const found = mockRaces.find((r) => r.id === id);
    if (found && !raceData) {
      setRaceData(found);
      setBets(found.bets);
      setUmamusumes(found.umamusumes);
    }
    return raceData || found;
  }, [id, raceData]);

  if (!race) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Race not found</h1>
          <Button onClick={() => navigate("/")}>Go back home</Button>
        </div>
      </div>
    );
  }

  const canBet = race.status === "active" || race.status === "upcoming";
  const isOpen = race.status === "open";
  const winner = race.winnerId ? umamusumes.find((u) => u.id === race.winnerId) : null;

  const handleSelectUma = (uma: Umamusume) => {
    if (!canBet) return;
    setSelectedUma(uma);
    setBetModalOpen(true);
  };

  const handlePlaceBet = (amount: number) => {
    if (!selectedUma || !user) return;

    const newBet: Bet = {
      id: `bet-${Date.now()}`,
      userId: user.id,
      username: user.username,
      umamusumeId: selectedUma.id,
      umamusumeName: selectedUma.name,
      amount,
      createdAt: new Date(),
    };

    setBets((prev) => [newBet, ...prev]);
    updateProfile({ balance: user.balance - amount });
    setBetModalOpen(false);
    setSelectedUma(null);
    toast.success(`Bet placed on ${selectedUma.name}!`);
  };

  const handleAddUmamusume = (uma: Omit<Umamusume, "id">) => {
    const newUma: Umamusume = {
      ...uma,
      id: `uma-${Date.now()}`,
    };
    setUmamusumes((prev) => [...prev, newUma]);
    toast.success(`${newUma.name} has been added to the race!`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 -ml-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to races
        </Button>

        {/* Race Header */}
        <section className="mb-8 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-display font-bold">{race.name}</h1>
                <StatusBadge status={race.status} />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl">{race.description}</p>
            </div>

            {isOpen && (
              <Button variant="gold" size="lg" onClick={() => setAddUmaModalOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Umamusume
              </Button>
            )}
            {canBet && umamusumes.length > 0 && (
              <Button variant="hero" size="lg" onClick={() => setSelectedUma(umamusumes[0])}>
                <Trophy className="h-5 w-5 mr-2" />
                Place a Bet
              </Button>
            )}
          </div>

          {/* Race Info */}
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Created by {race.createdBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created {format(race.createdAt, "MMM d, yyyy")}</span>
            </div>
            {race.scheduledAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Scheduled {format(race.scheduledAt, "MMM d, yyyy 'at' HH:mm")}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{umamusumes.length} runners</span>
            </div>
          </div>

          {/* Winner Banner */}
          {winner && (
            <div className="flex items-center gap-4 p-4 rounded-xl gradient-gold text-accent-foreground animate-fade-in">
              <Trophy className="h-8 w-8" />
              <div>
                <p className="text-sm font-medium opacity-90">Race Winner</p>
                <p className="text-xl font-bold">{winner.name}</p>
              </div>
            </div>
          )}
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Umamusumes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                <span className="text-2xl">🐴</span>
                Runners ({umamusumes.length})
              </h2>
              {isOpen && (
                <Button variant="outline" size="sm" onClick={() => setAddUmaModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {umamusumes.length > 0 ? (
              <div className="space-y-3">
                {umamusumes.map((uma, index) => (
                  <div
                    key={uma.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <UmamusumeCard
                      umamusume={uma}
                      isSelected={selectedUma?.id === uma.id}
                      canBet={canBet}
                      onSelect={handleSelectUma}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No runners yet. Be the first to add your Umamusume!</p>
                {isOpen && (
                  <Button variant="gold" onClick={() => setAddUmaModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your Umamusume
                  </Button>
                )}
              </Card>
            )}
          </div>

          {/* Bets Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  Active Bets
                </CardTitle>
                <CardDescription>
                  {bets.length} bets placed on this race
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BetsList bets={bets} umamusumes={umamusumes} />
              </CardContent>
            </Card>

            {/* Race Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4" />
                  How to Bet
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Select an Umamusume you think will win</p>
                <p>2. Enter your bet amount</p>
                <p>3. Confirm and wait for results!</p>
                <p className="pt-2 text-xs">
                  Your potential winnings = Bet × Odds
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BetModal
        open={betModalOpen}
        onOpenChange={setBetModalOpen}
        umamusume={selectedUma}
        onPlaceBet={handlePlaceBet}
      />

      <AddUmamusumeModal
        open={addUmaModalOpen}
        onOpenChange={setAddUmaModalOpen}
        onAdd={handleAddUmamusume}
      />
    </div>
  );
};

export default RaceDetail;
