import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { APTITUDE_GRADES } from "@/data/skills";
import { AptitudeGrade, Umamusume, UmamusumeAptitudes, UmamusumeStats } from "@/types";
import { toast } from "sonner";
import { useUmas } from '@/hooks/use-umas';
import { BaseUma, NewUmaProfile, AptitudeCreationData, AptitudeRank, Skill } from '@/services/umaService';

const toRank = (val: string): AptitudeRank => val as AptitudeRank;

const CreateUmamusume: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { create, fetchSkills, fetchBaseUmas, skills, base_uma, isLoading: isCreating } = useUmas();

  const [selectedBaseUma, setSelectedBaseUma] = useState<BaseUma | null>(null);
  const [baseUmaSearch, setBaseUmaSearch] = useState("");
  const [showBaseUmaDropdown, setShowBaseUmaDropdown] = useState(false);
  const [name, setName] = useState("");
  const [picture, setPicture] = useState<string>("");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  // Stats state matches backend expectation (numbers)
  const [stats, setStats] = useState({
    speed: 0,
    stamina: 0,
    power: 0,
    guts: 0,
    wit: 0,
  });

  // Aptitudes state
  const [aptitudes, setAptitudes] = useState<AptitudeCreationData>({
    turf: "A",
    dirt: "A",
    short: "A",
    mile: "A",
    medium: "A",
    long: "A",
    front: "A",
    pace: "A",
    late: "A",
    end: "A",
  });

  useEffect(() => {
    if (user) {
      fetchSkills();
      fetchBaseUmas();
    }
  }, [user, fetchSkills, fetchBaseUmas]);

  // Filter base umas from backend
  const filteredBaseUmas = base_uma.filter(
    uma => uma.name.toLowerCase().includes(baseUmaSearch.toLowerCase())
  );

  // Filter skills from backend
  const filteredSkills = skills.filter(
    skill =>
      skill.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.some(s => s.id === skill.id)
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(png|gif)$/)) {
        toast.error("Please upload a PNG or GIF file");
        return;
      }
      // Store the actual File object for upload
      setPictureFile(file);

      // Create preview string for display
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatChange = (stat: keyof UmamusumeStats, value: string) => {
    const numValue = Math.min(1200, Math.max(0, parseInt(value) || 0));
    setStats(prev => ({ ...prev, [stat]: numValue }));
  };

  const handleAptitudeChange = (aptitude: keyof UmamusumeAptitudes, value: AptitudeGrade) => {
    setAptitudes(prev => ({ ...prev, [aptitude]: value }));
  };

  const selectBaseUma = (uma: BaseUma) => {
    setSelectedBaseUma(uma);
    setBaseUmaSearch(uma.name);
    setShowBaseUmaDropdown(false);
    // Optionally pre-fill the name field with the base uma's name
    setName(uma.name);
  };

  const clearBaseUma = () => {
    setSelectedBaseUma(null);
    setBaseUmaSearch("");
  };

  const addSkill = (skill: Skill) => {
    setSelectedSkills(prev => [...prev, skill]);
    setSkillSearch("");
    setShowSkillDropdown(false);
  };

  const removeSkill = (skillId: number) => {
    setSelectedSkills(prev => prev.filter(s => s.id !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    // Extract skill IDs from selected skills
    const skill_ids = selectedSkills.map(skill => skill.id);

    // Create the data object that matches NewUmaProfile
    const newUmaProfile: NewUmaProfile = {
      name,
      avatar: pictureFile || null,
      base_uma_id: selectedBaseUma?.id || null,
      speed: stats.speed,
      stamina: stats.stamina,
      power: stats.power,
      guts: stats.guts,
      wit: stats.wit,
      skill_ids: skill_ids,
      aptitudes: aptitudes,
    };

    // Call the backend
    const success = await create(newUmaProfile);

    if (success) {
      navigate('/stable');
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Umamusume</CardTitle>
              <CardDescription>Add a new Umamusume to your stable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base Uma Selection */}
              <div className="space-y-2">
                <Label>Base Umamusume (Optional)</Label>
                <div className="relative">
                  <Input
                    placeholder="Search base umamusume..."
                    value={baseUmaSearch}
                    onChange={(e) => {
                      setBaseUmaSearch(e.target.value);
                      setShowBaseUmaDropdown(true);
                    }}
                    onFocus={() => setShowBaseUmaDropdown(true)}
                  />
                  {selectedBaseUma && (
                    <button
                      type="button"
                      onClick={clearBaseUma}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {showBaseUmaDropdown && filteredBaseUmas.length > 0 && !selectedBaseUma && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {filteredBaseUmas.slice(0, 10).map((uma) => (
                        <button
                          key={uma.id}
                          type="button"
                          onClick={() => selectBaseUma(uma)}
                          className="w-full px-4 py-2 text-left hover:bg-accent/50 text-sm flex items-center gap-2"
                        >
                          {uma.avatar_url && (
                            <img
                              src={uma.avatar_url}
                              alt={uma.name}
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <span>{uma.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedBaseUma && (
                  <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
                    {selectedBaseUma.avatar_url && (
                      <img
                        src={selectedBaseUma.avatar_url}
                        alt={selectedBaseUma.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <span className="text-sm font-medium">{selectedBaseUma.name}</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Avatar (PNG/GIF)</Label>
                  <div className="flex items-center gap-4">
                    {picture ? (
                      <div className="relative">
                        <img src={picture} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setPicture("");
                            setPictureFile(null);
                          }}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <input
                          type="file"
                          accept=".png,.gif"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Set stats between 0-1200</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
                {(Object.keys(stats) as Array<keyof UmamusumeStats>).map((stat) => (
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
                />
                {showSkillDropdown && filteredSkills.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredSkills.slice(0, 10).map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => addSkill(skill)}
                        className="w-full px-4 py-2 text-left hover:bg-accent/50 text-sm"
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((skill) => (
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
            <CardContent className="space-y-6">
              {/* Surface: Turf, Dirt */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Surface</Label>
                <div className="grid gap-4 grid-cols-2">
                  {(["turf", "dirt"] as Array<keyof UmamusumeAptitudes>).map((apt) => (
                    <div key={apt} className="space-y-2">
                      <Label className="capitalize">{apt}</Label>
                      <Select
                        value={aptitudes[apt]}
                        onValueChange={(value) => handleAptitudeChange(apt, value as AptitudeGrade)}
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
              </div>

              {/* Distance: Short, Mile, Medium, Long */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Distance</Label>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  {(["short", "mile", "medium", "long"] as Array<keyof UmamusumeAptitudes>).map((apt) => (
                    <div key={apt} className="space-y-2">
                      <Label className="capitalize">{apt}</Label>
                      <Select
                        value={aptitudes[apt]}
                        onValueChange={(value) => handleAptitudeChange(apt, value as AptitudeGrade)}
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
              </div>

              {/* Running Style: Front, Pace, Late, End */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Running Style</Label>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  {(["front", "pace", "late", "end"] as Array<keyof UmamusumeAptitudes>).map((apt) => (
                    <div key={apt} className="space-y-2">
                      <Label className="capitalize">{apt}</Label>
                      <Select
                        value={aptitudes[apt]}
                        onValueChange={(value) => handleAptitudeChange(apt, value as AptitudeGrade)}
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
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={isCreating}>
            <Check className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create Umamusume"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreateUmamusume;
