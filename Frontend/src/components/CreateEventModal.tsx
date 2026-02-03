import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (event: {
    name: string;
    description: string;
    scheduledAt: Date;
  }) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !scheduledAt) return;

    onCreate({
      name: name.trim(),
      description: description.trim(),
      scheduledAt,
    });

    // Reset form
    setName("");
    setDescription("");
    setScheduledAt(undefined);
    onOpenChange(false);
  };

  const isValid = name.trim() && description.trim() && scheduledAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Create New Race</DialogTitle>
          <DialogDescription>
            Create a new race event. Others can add their Umamusumes once it's created.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Race Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Grand Prix"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the race event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Scheduled Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledAt ? format(scheduledAt, "PPP 'at' HH:mm") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledAt}
                  onSelect={setScheduledAt}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Create Race
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
