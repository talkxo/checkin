'use client';

import { useState } from 'react';

export interface DayBreakdownEntry {
  date: string;
  checkinTime: string;
  checkoutTime: string | null;
  hoursWorked: number;
  mode: string;
  baseScore: number;
  hoursBonus: number;
  checkoutBonus: number;
  modeBonus: number;
  totalScore: number;
}

export interface PunctualityStats {
  punctualityScore: number;
  maxScore: number;
  noFillDays: number;
  avgCheckinTime: string;
  checkinStatus: 'early' | 'late' | 'on-time' | null;
  dayBreakdown?: DayBreakdownEntry[];
  consistencyBonus?: number;
  streakBonus?: number;
  windowDates?: string[];
}

/**
 * Loads the consolidated dashboard payload (/api/dashboard/init) and exposes
 * the punctuality stats used by the Overview cards and the deep-score modal.
 */
export function useDashboardData(setMe: React.Dispatch<React.SetStateAction<any>>) {
  const [punctualityStats, setPunctualityStats] = useState<PunctualityStats | null>(null);

  const fetchDashboardInit = async () => {
    try {
      const r = await fetch('/api/dashboard/init');

      if (r.status === 401) {
        // Don't force logout here — let the calling context handle it
        return;
      }

      if (!r.ok) return;

      const data = await r.json();
      if (data.success) {
        setMe(data.employee);
        setPunctualityStats(data.stats.punctualityStats);
      }
    } catch (e) {
      console.error('Error in dashboard init:', e);
    }
  };

  return { punctualityStats, fetchDashboardInit };
}
