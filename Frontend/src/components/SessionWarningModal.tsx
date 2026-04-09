import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            You will be logged out due to inactivity in:
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="text-4xl font-bold text-amber-500 tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        <DialogDescription className="text-center">
          Do you want to continue your session?
        </DialogDescription>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onLogout} className="flex-1">
            Logout Now
          </Button>
          <Button onClick={onExtend} className="flex-1">
            Continue Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
