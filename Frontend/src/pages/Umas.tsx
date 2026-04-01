import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { LayoutGrid, List, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getBaseUmas } from "@/services/umaService";
import type { BaseUma } from "@/services/umaService";

const Umas: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [umas, setUmas] = useState<BaseUma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isGrid, setIsGrid] = useState(true);
  const [selected, setSelected] = useState<BaseUma | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const data = await getBaseUmas();
        setUmas(data);
      } catch {
        // silently fail — empty list shown
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const filtered = umas.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold">Umas</h1>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search umas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={isGrid ? "default" : "outline"}
              size="icon"
              onClick={() => setIsGrid(true)}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={!isGrid ? "default" : "outline"}
              size="icon"
              onClick={() => setIsGrid(false)}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {search ? "No umas match your search." : "No umas available."}
          </p>
        ) : isGrid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((uma) => (
              <button
                key={uma.id}
                onClick={() => setSelected(uma)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border hover:border-primary hover:shadow-md transition-all text-center"
              >
                <Avatar className="h-20 w-20">
                  <AvatarImage src={uma.avatar_url ?? undefined} alt={uma.name} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    🐴
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium leading-tight">{uma.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Avatar</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((uma) => (
                  <tr key={uma.id} className="border-t hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={uma.avatar_url ?? undefined} alt={uma.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          🐴
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="px-4 py-2 font-medium">{uma.name}</td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(uma)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail popup */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={selected.avatar_url ?? undefined} alt={selected.name} />
                  <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                    🐴
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                  <p className="text-lg font-semibold">{selected.name}</p>
                  <Badge variant="outline">Base Uma</Badge>
                </div>
              </div>

              {selected.skills && selected.skills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Unique Skills</p>
                  <div className="space-y-3">
                    {selected.skills.map((skill) => (
                      <div key={skill.id} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                        <p className="text-sm font-semibold">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">{skill.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Umas;
