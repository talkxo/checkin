'use client';

import { useEffect, useState } from 'react';

/** Ticks once per second and returns the current time. */
export function useClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return currentTime;
}
