import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Trophy, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUmas } from "@/services/umaService";
import type { Uma } from "@/services/umaService";

type SortKey = "total" | "speed" | "stamina" | "power" | "guts" | "wit";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "total",   label: "Total Score" },
  { key: "speed",   label: "Speed"       },
  { key: "stamina", label: "Stamina"     },
  { key: "power",   label: "Power"       },
  { key: "guts",    label: "Guts"        },
  { key: "wit",     label: "Wit"         },
];

const computeScore = (uma: Uma, key: SortKey): number =>
  key === "total"
    ? uma.speed + uma.stamina + uma.power + uma.guts + uma.wit
    : uma[key];

const getRankStyle = (rank: number): { badge: string; row: string } => {
  if (rank === 1) return { badge: "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-300", row: "bg-yellow-400/10 border-l-4 border-yellow-400" };
  if (rank === 2) return { badge: "bg-slate-300 text-slate-800 ring-2 ring-slate-200",   row: "bg-slate-300/10 border-l-4 border-slate-300" };
  if (rank === 3) return { badge: "bg-amber-600 text-amber-50 ring-2 ring-amber-400",    row: "bg-amber-600/10 border-l-4 border-amber-500" };
  return { badge: "bg-muted text-muted-foreground", row: "" };
};

const Ranking: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [umas, setUmas] = useState<Uma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchRanking = async () => {
      try {
        const data = await getAllUmas();
        setUmas(data);
      } catch {
        setError("Failed to load ranking data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRanking();
  }, [isAuthenticated]);

  const ranked = useMemo(() => {
    const lc = search.toLowerCase().trim();
    const filtered = lc
      ? umas.filter(
          (u) =>
            u.name.toLowerCase().includes(lc) ||
            (u.user_username ?? "").toLowerCase().includes(lc)
        )
      : umas;
    return [...filtered]
      .sort((a, b) => computeScore(b, sortKey) - computeScore(a, sortKey))
      .slice(0, 10);
  }, [umas, sortKey, search]);

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Top 10 Ranking</h1>
              <p className="text-sm text-muted-foreground">Best Umamusume by stats</p>
            </div>
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or trainer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SORT_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              variant={sortKey === opt.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSortKey(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* States */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Loading...</p>
        ) : error ? (
          <p className="text-center text-destructive py-16">{error}</p>
        ) : ranked.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {search ? "No Umamusume match your search." : "No Umamusume available."}
          </p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-14">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Umamusume</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Trainer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((uma, index) => {
                  const rank = index + 1;
                  const { badge, row } = getRankStyle(rank);
                  const score = computeScore(uma, sortKey);
                  return (
                    <tr key={uma.id} className={`border-t transition-colors hover:opacity-90 ${row}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
                          {rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/umamusume/${uma.id}`}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={uma.avatar_url ?? undefined} alt={uma.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {uma.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold hover:text-primary transition-colors">
                            {uma.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {uma.user_username ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {score.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Ranking;
