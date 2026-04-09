import { useEffect, useRef, useState } from 'react';

interface UseSessionTimeoutOptions {
  timeoutMinutes: number;
  warningMinutes: number;
  onTimeout: () => void;
  enabled: boolean;
}

export const useSessionTimeout = ({
  timeoutMinutes,
  warningMinutes,
  onTimeout,
  enabled,
}: UseSessionTimeoutOptions) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);

    if (!enabled || timeoutMinutes <= 0) return;

    // Set warning timer
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;
    if (warningMs > 0) {
      warningRef.current = setTimeout(() => {
        setShowWarning(true);
        setRemainingSeconds(warningMinutes * 60);

        // Start countdown
        countdownRef.current = setInterval(() => {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, warningMs);
    }

    // Set logout timer
    const timeoutMs = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    const handleActivity = () => {
      resetTimer();
    };

    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [timeoutMinutes, warningMinutes, onTimeout, enabled]);

  const extendSession = () => {
    resetTimer();
  };

  return { showWarning, remainingSeconds, extendSession };
};
