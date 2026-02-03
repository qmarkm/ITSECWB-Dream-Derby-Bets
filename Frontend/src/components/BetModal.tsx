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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Umamusume } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface BetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  umamusume: Umamusume | null;
  onPlaceBet: (amount: number) => void;
}

export const BetModal: React.FC<BetModalProps> = ({
  open,
  onOpenChange,
  umamusume,
  onPlaceBet,
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(100);

  if (!umamusume || !user) return null;

  const maxBet = Math.min(user.balance, 10000);
  const potentialWin = amount * umamusume.odds;

  const handlePlaceBet = () => {
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > user.balance) {
      toast.error("Insufficient balance");
      return;
    }
    onPlaceBet(amount);
    setAmount(100);
  };

  const quickAmounts = [100, 500, 1000, 2500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Place Your Bet</DialogTitle>
          <DialogDescription>
            Bet on {umamusume.name} to win the race!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Umamusume */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={umamusume.picture} alt={umamusume.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {umamusume.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold">{umamusume.name}</h4>
              <p className="text-sm text-muted-foreground">Odds: x{umamusume.odds.toFixed(1)}</p>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <div className="flex items-center gap-1.5 font-semibold">
              <Coins className="h-4 w-4 text-accent" />
              {user.balance.toLocaleString()}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="amount">Bet Amount</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              max={maxBet}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-lg font-semibold"
            />
            <Slider
              value={[amount]}
              onValueChange={([value]) => setAmount(value)}
              max={maxBet}
              min={1}
              step={10}
              className="py-2"
            />
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2">
            {quickAmounts.map((quickAmount) => (
              <Button
                key={quickAmount}
                variant={amount === quickAmount ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setAmount(quickAmount)}
                disabled={quickAmount > user.balance}
              >
                {quickAmount.toLocaleString()}
              </Button>
            ))}
          </div>

          {/* Potential Win */}
          <div className="flex items-center justify-between p-4 rounded-xl gradient-gold text-accent-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Potential Win</span>
            </div>
            <span className="text-xl font-bold">{potentialWin.toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handlePlaceBet}
            disabled={amount <= 0 || amount > user.balance}
          >
            <Coins className="h-4 w-4 mr-2" />
            Place Bet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
