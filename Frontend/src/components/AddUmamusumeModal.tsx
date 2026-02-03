import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Umamusume } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface AddUmamusumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (umamusume: Omit<Umamusume, "id">) => void;
}

export const AddUmamusumeModal: React.FC<AddUmamusumeModalProps> = ({
  open,
  onOpenChange,
  onAdd,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [odds, setOdds] = useState("2.0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      picture: picture.trim() || "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=200&h=200&fit=crop",
      owner: user?.username || "Unknown",
      ownerId: user?.id || "",
      odds: parseFloat(odds) || 2.0,
      stats: { speed: 800, stamina: 750, power: 700, guts: 650, wit: 600 },
      skills: [],
      aptitudes: {
        turf: "A", dirt: "B", short: "B", mile: "A", medium: "A",
        long: "B", front: "A", pace: "B", late: "B", end: "C",
      },
    });

    setName("");
    setPicture("");
    setOdds("2.0");
    onOpenChange(false);
  };

  const isValid = name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Add Your Umamusume</DialogTitle>
          <DialogDescription>
            Enter the details of the Umamusume you want to add to this race.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uma-name">Umamusume Name</Label>
            <Input
              id="uma-name"
              placeholder="e.g., Special Week"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uma-picture">Picture URL (optional)</Label>
            <Input
              id="uma-picture"
              placeholder="https://example.com/image.jpg"
              value={picture}
              onChange={(e) => setPicture(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uma-odds">Starting Odds</Label>
            <Input
              id="uma-odds"
              type="number"
              step="0.1"
              min="1.1"
              max="100"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Add Umamusume
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
