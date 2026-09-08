'use client';

import { useEffect, useRef, useState } from 'react';

const HOLD_DURATION_MS = 2500;
const TICK_MS = 50;

/**
 * Hold-to-confirm interaction. `onComplete` fires once when the hold reaches
 * 100%; it always sees the latest closure via a ref, so callers can pass a
 * fresh inline callback each render.
 */
export function useHoldToConfirm(onComplete: () => void) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const progress = Math.min(100, ((Date.now() - startedAt) / HOLD_DURATION_MS) * 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsHolding(false);
        onCompleteRef.current();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isHolding]);

  return {
    isHolding,
    holdProgress,
    handleHoldStart: () => setIsHolding(true),
    handleHoldEnd: () => setIsHolding(false),
  };
}
