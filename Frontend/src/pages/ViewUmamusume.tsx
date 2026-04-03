import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit2, User, Zap, Heart, Flame, Brain, Shield } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getUma } from "@/services/umaService";
import type { Uma, AptitudeCreationData } from "@/services/umaService";

type StatKey = "speed" | "stamina" | "power" | "guts" | "wit";
type AptitudeKey = keyof AptitudeCreationData;

const statIcons: Record<StatKey, React.ReactNode> = {
  speed: <Zap className="h-4 w-4" />,
  stamina: <Heart className="h-4 w-4" />,
  power: <Flame className="h-4 w-4" />,
  guts: <Shield className="h-4 w-4" />,
  wit: <Brain className="h-4 w-4" />,
};

const statColors: Record<StatKey, string> = {
  speed: "bg-blue-500",
  stamina: "bg-red-500",
  power: "bg-orange-500",
  guts: "bg-yellow-500",
  wit: "bg-purple-500",
};

const aptitudeColors: Record<string, string> = {
  S: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
  A: "bg-pink-500 text-white",
  B: "bg-orange-500 text-white",
  C: "bg-yellow-500 text-white",
  D: "bg-green-500 text-white",
  E: "bg-blue-500 text-white",
  F: "bg-indigo-500 text-white",
  G: "bg-gray-500 text-white",
};

const STAT_KEYS: StatKey[] = ["speed", "stamina", "power", "guts", "wit"];
const GROUND_APTITUDES: AptitudeKey[] = ["turf", "dirt"];
const DISTANCE_APTITUDES: AptitudeKey[] = ["short", "mile", "medium", "long"];
const STRATEGY_APTITUDES: AptitudeKey[] = ["front", "pace", "late", "end"];

const ViewUmamusume: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [umamusume, setUmamusume] = useState<Uma | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getUma(numericId)
      .then(setUmamusume)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (notFound || !umamusume) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Umamusume not found.</p>
        </main>
      </div>
    );
  }

  const isOwner = user && umamusume.user === user.id;
  const aptitudes = umamusume.aptitudes;
  const skills = umamusume.skills ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" className="-ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {isOwner && (
            <Button asChild>
              <Link to={`/umamusume/${id}/edit`}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Header Card */}
          <Card className="overflow-hidden">
            <div className="h-32 gradient-primary" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16">
                <Avatar className="h-32 w-32 border-4 border-card shadow-lg">
                  <AvatarImage src={umamusume.avatar_url ?? undefined} alt={umamusume.name} />
                  <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                    {umamusume.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left pb-2">
                  <h1 className="text-3xl font-display font-bold">{umamusume.name}</h1>
                  {umamusume.user_username && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start mt-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Trainer: {umamusume.user_username}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Performance metrics (0–1200)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {STAT_KEYS.map((stat) => (
                <div key={stat} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded ${statColors[stat]} text-white`}>
                        {statIcons[stat]}
                      </span>
                      <span className="font-medium capitalize">{stat}</span>
                    </div>
                    <span className="font-bold">{umamusume[stat]}</span>
                  </div>
                  <Progress value={(umamusume[stat] / 1200) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Aptitudes Card */}
          {aptitudes && (
            <Card>
              <CardHeader>
                <CardTitle>Aptitudes</CardTitle>
                <CardDescription>Performance grades by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Ground</h4>
                  <div className="flex gap-2">
                    {GROUND_APTITUDES.map((apt) => (
                      <div key={apt} className="flex-1 text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground capitalize mb-1">{apt}</p>
                        <Badge className={aptitudeColors[aptitudes[apt]]}>{aptitudes[apt]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Distance</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {DISTANCE_APTITUDES.map((apt) => (
                      <div key={apt} className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground capitalize mb-1">{apt}</p>
                        <Badge className={aptitudeColors[aptitudes[apt]]}>{aptitudes[apt]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Strategy</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {STRATEGY_APTITUDES.map((apt) => (
                      <div key={apt} className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground capitalize mb-1">{apt}</p>
                        <Badge className={aptitudeColors[aptitudes[apt]]}>{aptitudes[apt]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills Card */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Acquired abilities</CardDescription>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="px-3 py-1">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No skills acquired yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ViewUmamusume;
