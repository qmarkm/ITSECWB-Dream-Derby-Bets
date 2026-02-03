import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Check, Trash2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AVAILABLE_SKILLS, APTITUDE_GRADES } from "@/data/skills";
import { AptitudeGrade, Umamusume, UmamusumeAptitudes, UmamusumeStats } from "@/types";
import { mockUmamusumes } from "@/data/mockData";
import { toast } from "sonner";

const EditUmamusume: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [picture, setPicture] = useState<string>("");
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [originalUma, setOriginalUma] = useState<Umamusume | null>(null);
  
  const [stats, setStats] = useState<UmamusumeStats>({
    speed: 0,
    stamina: 0,
    power: 0,
    guts: 0,
    wit: 0,
  });
  
  const [aptitudes, setAptitudes] = useState<UmamusumeAptitudes>({
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
    const storedUmas: Umamusume[] = JSON.parse(localStorage.getItem("userUmamusumes") || "[]");
    const allUmas = [...mockUmamusumes, ...storedUmas];
    const uma = allUmas.find(u => u.id === id);
    
    if (uma) {
      setOriginalUma(uma);
      setName(uma.name);
      setPicture(uma.picture);
      setSelectedSkills(uma.skills || []);
      if (uma.stats) setStats(uma.stats);
      if (uma.aptitudes) setAptitudes(uma.aptitudes);
    }
  }, [id]);

  const filteredSkills = AVAILABLE_SKILLS.filter(
    skill => 
      skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.includes(skill)
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(png|gif)$/)) {
        toast.error("Please upload a PNG or GIF file");
        return;
      }
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

  const addSkill = (skill: string) => {
    setSelectedSkills(prev => [...prev, skill]);
    setSkillSearch("");
    setShowSkillDropdown(false);
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const updatedUmamusume: Umamusume = {
      ...originalUma!,
      name,
      picture: picture || originalUma!.picture,
      stats,
      skills: selectedSkills,
      aptitudes,
    };

    const storedUmas: Umamusume[] = JSON.parse(localStorage.getItem("userUmamusumes") || "[]");
    const updatedUmas = storedUmas.map(u => u.id === id ? updatedUmamusume : u);
    localStorage.setItem("userUmamusumes", JSON.stringify(updatedUmas));
    
    toast.success("Umamusume updated successfully!");
    navigate(`/umamusume/${id}`);
  };

  const handleDelete = () => {
    const storedUmas: Umamusume[] = JSON.parse(localStorage.getItem("userUmamusumes") || "[]");
    const filteredUmas = storedUmas.filter(u => u.id !== id);
    localStorage.setItem("userUmamusumes", JSON.stringify(filteredUmas));
    
    toast.success("Umamusume deleted!");
    navigate("/profile");
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!originalUma) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Umamusume not found</p>
        </main>
      </div>
    );
  }

  const isOwner = originalUma.ownerId === user.id;

  if (!isOwner) {
    navigate(`/umamusume/${id}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="-ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Umamusume</CardTitle>
              <CardDescription>Update your Umamusume's details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                          onClick={() => setPicture("")}
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
                        key={skill}
                        type="button"
                        onClick={() => addSkill(skill)}
                        className="w-full px-4 py-2 text-left hover:bg-accent/50 text-sm"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aptitudes</CardTitle>
              <CardDescription>Set aptitude grades (S to G)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
                {(Object.keys(aptitudes) as Array<keyof UmamusumeAptitudes>).map((apt) => (
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
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg">
            <Check className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </form>
      </main>
    </div>
  );
};

export default EditUmamusume;
