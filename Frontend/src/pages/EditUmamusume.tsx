import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, X, Check, Trash2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { APTITUDE_GRADES } from "@/data/skills";
import { toast } from "sonner";
import {
  getUma,
  getSkills,
  updateUma,
  deleteUma,
  Uma,
  Skill,
  AptitudeCreationData,
  AptitudeRank,
} from "@/services/umaService";

const STAT_KEYS = ["speed", "stamina", "power", "guts", "wit"] as const;
type StatKey = typeof STAT_KEYS[number];

const APTITUDE_KEYS = ["turf", "dirt", "short", "mile", "medium", "long", "front", "pace", "late", "end"] as const;
type AptitudeKey = typeof APTITUDE_KEYS[number];

const DEFAULT_APTITUDES: AptitudeCreationData = {
  turf: "G", dirt: "G",
  short: "G", mile: "G", medium: "G", long: "G",
  front: "G", pace: "G", late: "G", end: "G",
};

const EditUmamusume: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isAuthLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [originalUma, setOriginalUma] = useState<Uma | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  const [stats, setStats] = useState<Record<StatKey, number>>({
    speed: 0, stamina: 0, power: 0, guts: 0, wit: 0,
  });

  const [aptitudes, setAptitudes] = useState<AptitudeCreationData>(DEFAULT_APTITUDES);

  useEffect(() => {
    if (!isAuthenticated) return;
    const numericId = Number(id);
    if (!numericId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [uma, skills] = await Promise.all([getUma(numericId), getSkills()]);
        setOriginalUma(uma);
        setName(uma.name);
        setSelectedSkillIds(uma.skills.map((s) => s.id));
        setStats({
          speed: uma.speed,
          stamina: uma.stamina,
          power: uma.power,
          guts: uma.guts,
          wit: uma.wit,
        });
        if (uma.aptitudes) {
          setAptitudes(uma.aptitudes);
        }
        setAvailableSkills(skills);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, isAuthenticated]);

  const filteredSkills = availableSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkillIds.includes(s.id)
  );

  const selectedSkillObjects = availableSkills.filter((s) => selectedSkillIds.includes(s.id));

  const handleStatChange = (stat: StatKey, value: string) => {
    const numValue = Math.min(1200, Math.max(0, parseInt(value) || 0));
    setStats((prev) => ({ ...prev, [stat]: numValue }));
  };

  const addSkill = (skillId: number) => {
    setSelectedSkillIds((prev) => [...prev, skillId]);
    setSkillSearch("");
    setShowSkillDropdown(false);
  };

  const removeSkill = (skillId: number) => {
    setSelectedSkillIds((prev) => prev.filter((s) => s !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setIsSaving(true);
    try {
      await updateUma(Number(id), {
        name: name.trim(),
        ...stats,
        skill_ids: selectedSkillIds,
        aptitudes,
      });
      toast.success("Umamusume updated!");
      navigate(`/umamusume/${id}`);
    } catch {
      toast.error("Failed to update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUma(Number(id));
      toast.success("Umamusume deleted.");
      navigate("/profile");
    } catch {
      toast.error("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

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

  if (notFound || !originalUma) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Umamusume not found</p>
        </main>
      </div>
    );
  }

  if (originalUma.user !== user?.id) {
    return <Navigate to={`/umamusume/${id}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" className="-ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Umamusume</CardTitle>
              <CardDescription>Update your Umamusume's details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name..."
                />
              </div>

              {originalUma.avatar_url && (
                <div className="space-y-2">
                  <Label>Current Avatar</Label>
                  <img
                    src={originalUma.avatar_url}
                    alt={originalUma.name}
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Set stats between 0–1200</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
                {STAT_KEYS.map((stat) => (
                  <div key={stat} className="space-y-2">
                    <Label htmlFor={stat} className="capitalize">{stat}</Label>
                    <Input
                      id={stat}
                      type="number"
                      min={0}
                      max={1200}
                      value={stats[stat]}
                      onChange={(e) => handleStatChange(stat, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Select skills for your Umamusume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={(e) => {
                    setSkillSearch(e.target.value);
                    setShowSkillDropdown(true);
                  }}
                  onFocus={() => setShowSkillDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSkillDropdown(false), 150)}
                />
                {showSkillDropdown && filteredSkills.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredSkills.slice(0, 10).map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onMouseDown={() => addSkill(skill.id)}
                        className="w-full px-4 py-2 text-left hover:bg-accent/50 text-sm"
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSkillObjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSkillObjects.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="gap-1">
                      {skill.name}
                      <button type="button" onClick={() => removeSkill(skill.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aptitudes */}
          <Card>
            <CardHeader>
              <CardTitle>Aptitudes</CardTitle>
              <CardDescription>Set aptitude grades (S to G)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
                {APTITUDE_KEYS.map((apt) => (
                  <div key={apt} className="space-y-2">
                    <Label className="capitalize">{apt}</Label>
                    <Select
                      value={aptitudes[apt]}
                      onValueChange={(value) =>
                        setAptitudes((prev) => ({ ...prev, [apt]: value as AptitudeRank }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APTITUDE_GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={isSaving}>
            <Check className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default EditUmamusume;
