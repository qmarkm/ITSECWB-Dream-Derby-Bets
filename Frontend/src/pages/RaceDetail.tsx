import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, Users, Trophy, Clock, User, Coins,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRaceEvent, placeBid, updateBid, cancelBid, enrollUmamusume,
} from "@/services/eventsService";
import type { RaceEvent, Bid, RaceParticipant } from "@/services/eventsService";
import { getMyUmas } from "@/services/umaService";
import type { Uma } from "@/services/umaService";
import { format } from "date-fns";
import { toast } from "sonner";

const RaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [race, setRace] = useState<RaceEvent | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  // Bid form
  const [selectedParticipant, setSelectedParticipant] = useState<RaceParticipant | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Edit / cancel
  const [editAmount, setEditAmount] = useState("");
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Enroll
  const [myUmas, setMyUmas] = useState<Uma[]>([]);
  const [selectedEnrollId, setSelectedEnrollId] = useState<number | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollConfirm, setEnrollConfirm] = useState(false);

  const raceId = id ? parseInt(id) : null;

  useEffect(() => {
    if (!raceId) return;
    setLoading(true);
    getRaceEvent(raceId)
      .then(({ race: r, bids: b }) => {
        setRace(r);
        setBids(b);
      })
      .catch(() => toast.error("Failed to load race."))
      .finally(() => setLoading(false));
  }, [raceId]);

  // Load user's Umas for enrollment when race is scheduled
  useEffect(() => {
    if (race?.status === "scheduled" && isAuthenticated) {
      getMyUmas().then(setMyUmas).catch(() => {});
    }
  }, [race?.status, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Loading race...
        </div>
      </div>
    );
  }

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

  const myBid = bids.find((b) => user?.id != null && b.bidder === user.id)
    ?? bids.find((b) => b.bidder_username === user?.username);
  const isOpen = race.status === "open";
  const isScheduled = race.status === "scheduled";
  const isCompleted = race.status === "completed";
  const canModifyBid = isOpen; // edit/cancel allowed while open
  const winner = isCompleted ? race.participants.find((p) => p.place === 1) : null;
  const title = race.track_name ?? `Race #${race.id}`;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raceId) return;
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount."); return; }
    setIsPlacingBet(true);
    try {
      const bid = await placeBid(raceId, {
        amount,
        uma: selectedParticipant?.id ?? null,
      });
      setBids((prev) => [bid, ...prev]);
      setRace((prev) => prev ? { ...prev, bid_count: prev.bid_count + 1 } : prev);
      setBetAmount("");
      setSelectedParticipant(null);
      refreshUser();
      toast.success("Bet placed!");
    } catch (err: any) {
      const msg = err?.response?.data?.amount?.[0]
        || err?.response?.data?.non_field_errors?.[0]
        || err?.response?.data?.error
        || "Failed to place bet.";
      toast.error(msg);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myBid) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount."); return; }
    setIsSavingEdit(true);
    try {
      const updated = await updateBid(myBid.id, amount);
      setBids((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setIsEditingBid(false);
      refreshUser();
      toast.success("Bet updated.");
    } catch (err: any) {
      const msg = err?.response?.data?.amount?.[0]
        || err?.response?.data?.error
        || "Failed to update bet.";
      toast.error(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelBid = async () => {
    if (!myBid) return;
    setIsCancelling(true);
    try {
      await cancelBid(myBid.id);
      setBids((prev) => prev.filter((b) => b.id !== myBid.id));
      setRace((prev) => prev ? { ...prev, bid_count: Math.max(0, prev.bid_count - 1) } : prev);
      setCancelConfirm(false);
      refreshUser();
      toast.success("Bid cancelled and refunded.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to cancel bid.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleEnroll = async () => {
    if (!raceId || !selectedEnrollId) return;
    setIsEnrolling(true);
    try {
      await enrollUmamusume(raceId, selectedEnrollId);
      // Re-fetch full race data so participant details (name, stats, avatar) are complete
      const { race: updated, bids: updatedBids } = await getRaceEvent(raceId);
      setRace(updated);
      setBids(updatedBids);
      setSelectedEnrollId(null);
      setEnrollConfirm(false);
      toast.success("Umamusume enrolled!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to enroll.");
    } finally {
      setIsEnrolling(false);
    }
  };

  // Already enrolled uma IDs (by umamusume ID, not result ID)
  const enrolledUmaIds = new Set(race.participants.map((p) => p.umamusume));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6 -ml-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to races
        </Button>

        {/* Race Header */}
        <section className="mb-8 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-display font-bold">{title}</h1>
                <StatusBadge status={race.status} />
              </div>
              {race.track_name && (
                <p className="text-lg text-muted-foreground">Track: {race.track_name}</p>
              )}
            </div>
          </div>

          {/* Race meta */}
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Hosted by {race.host_username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created {format(new Date(race.created_at), "MMM d, yyyy")}</span>
            </div>
            {race.race_start_dt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Starts {format(new Date(race.race_start_dt), "MMM d, yyyy 'at' HH:mm")}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{race.participants.length} runners</span>
            </div>
          </div>

          {/* Winner banner */}
          {winner && (
            <div className="flex items-center gap-4 p-4 rounded-xl gradient-gold text-accent-foreground">
              <Trophy className="h-8 w-8" />
              <div>
                <p className="text-sm font-medium opacity-90">Race Winner</p>
                <p className="text-xl font-bold">{winner.umamusume_data?.name ?? "Unknown"}</p>
              </div>
            </div>
          )}
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Participants */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <span className="text-2xl">🐴</span>
              Runners ({race.participants.length})
            </h2>

            {race.participants.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No runners enrolled yet.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {race.participants
                  .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
                  .map((p) => {
                    const isSelected = selectedParticipant?.id === p.id;
                    return (
                      <Card
                        key={p.id}
                        className={`transition-all cursor-pointer ${
                          isOpen && !myBid
                            ? isSelected
                              ? "border-primary ring-1 ring-primary"
                              : "hover:border-primary/50"
                            : ""
                        }`}
                        onClick={() => {
                          if (isOpen && !myBid) {
                            setSelectedParticipant(isSelected ? null : p);
                          }
                        }}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          {isCompleted && p.place != null && (
                            <span className={`text-2xl font-bold w-8 text-center ${p.place === 1 ? "text-accent" : "text-muted-foreground"}`}>
                              #{p.place}
                            </span>
                          )}
                          <Avatar className="h-12 w-12 border-2 border-card">
                            <AvatarImage src={p.umamusume_data?.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {(p.umamusume_data?.name ?? "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{p.umamusume_data?.name ?? `Uma #${p.umamusume}`}</p>
                            {p.umamusume_data?.user_username && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Trainer: {p.umamusume_data.user_username}
                              </p>
                            )}
                          </div>
                          {isOpen && !myBid && isSelected && (
                            <Badge variant="default" className="shrink-0">Selected</Badge>
                          )}
                          {myBid?.uma === p.id && (
                            <Badge variant="secondary" className="shrink-0">Your Bet</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}

            {/* Enroll panel — visible when scheduled */}
            {isScheduled && isAuthenticated && myUmas.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Enroll Your Umamusume</CardTitle>
                  <CardDescription>Pick one of your Umamusumes to join this race.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {myUmas.map((uma) => {
                      const alreadyEnrolled = enrolledUmaIds.has(uma.id);
                      return (
                        <button
                          key={uma.id}
                          type="button"
                          disabled={alreadyEnrolled}
                          onClick={() => { setSelectedEnrollId(uma.id); setEnrollConfirm(false); }}
                          className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                            alreadyEnrolled
                              ? "opacity-40 cursor-not-allowed"
                              : selectedEnrollId === uma.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={uma.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{uma.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{uma.name}</span>
                          {alreadyEnrolled && <span className="ml-auto text-xs text-muted-foreground">Enrolled</span>}
                        </button>
                      );
                    })}
                  </div>
                  {selectedEnrollId && !enrollConfirm && (
                    <Button className="w-full" onClick={() => setEnrollConfirm(true)}>
                      Enroll {myUmas.find((u) => u.id === selectedEnrollId)?.name}
                    </Button>
                  )}
                  {enrollConfirm && (
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={handleEnroll} disabled={isEnrolling}>
                        {isEnrolling ? "Enrolling..." : "Confirm Enroll"}
                      </Button>
                      <Button variant="outline" onClick={() => setEnrollConfirm(false)}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Bids sidebar */}
          <div className="space-y-4">
            {/* Place / Edit / Cancel Bid */}
            {isOpen && isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    {myBid ? "Your Bet" : "Place a Bet"}
                  </CardTitle>
                  {user && (
                    <CardDescription>Balance: {Number(user.balance).toLocaleString()} coins</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {myBid && !isEditingBid ? (
                    /* Existing bid view */
                    <div className="space-y-3">
                      <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-xl font-bold">{Number(myBid.amount).toLocaleString()} coins</p>
                        {myBid.umamusume_name && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">Bet on</p>
                            <p className="text-sm font-medium">{myBid.umamusume_name}</p>
                          </>
                        )}
                      </div>
                      {canModifyBid && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => { setEditAmount(String(myBid.amount)); setIsEditingBid(true); setCancelConfirm(false); }}
                          >
                            Edit Amount
                          </Button>
                          {!cancelConfirm ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => setCancelConfirm(true)}
                            >
                              Cancel Bet
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={handleCancelBid}
                              disabled={isCancelling}
                            >
                              {isCancelling ? "Cancelling..." : "Confirm Cancel"}
                            </Button>
                          )}
                        </div>
                      )}
                      {cancelConfirm && (
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setCancelConfirm(false)}>
                          Keep My Bet
                        </Button>
                      )}
                    </div>
                  ) : myBid && isEditingBid ? (
                    /* Edit bid form */
                    <form onSubmit={handleSaveEdit} className="space-y-3">
                      <div>
                        <Label htmlFor="edit-amount">New Amount</Label>
                        <Input
                          id="edit-amount"
                          type="number"
                          min={1}
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="flex-1" disabled={isSavingEdit}>
                          {isSavingEdit ? "Saving..." : "Save"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingBid(false)}>
                          Back
                        </Button>
                      </div>
                    </form>
                  ) : (
                    /* Place bid form */
                    <form onSubmit={handlePlaceBet} className="space-y-3">
                      {selectedParticipant && (
                        <div className="text-sm rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                          Betting on: <span className="font-semibold">{selectedParticipant.umamusume_data?.name}</span>
                          <button
                            type="button"
                            className="ml-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedParticipant(null)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {!selectedParticipant && (
                        <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary animate-pulse">
                          Click a runner on the left to select who you're betting on
                        </div>
                      )}
                      <div>
                        <Label htmlFor="bet-amount">Amount</Label>
                        <Input
                          id="bet-amount"
                          type="number"
                          min={1}
                          step="0.01"
                          placeholder="Enter amount..."
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isPlacingBet}>
                        {isPlacingBet ? "Placing..." : "Place Bet"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* All bids */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  Bets ({bids.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bets placed yet.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {bids.map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <div>
                          <span className="font-medium">{bid.bidder_username}</span>
                          {bid.umamusume_name && (
                            <span className="text-xs text-muted-foreground block">on {bid.umamusume_name}</span>
                          )}
                        </div>
                        <span className="font-semibold">{Number(bid.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How to bet guide */}
            {isOpen && !myBid && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How to Bet</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Click a runner card to select them (optional)</p>
                  <p>2. Enter your bet amount</p>
                  <p>3. Hit Place Bet and wait for results!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RaceDetail;
