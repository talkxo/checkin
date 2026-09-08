'use client';

import { useEffect, useState } from 'react';
import { getMondayOfWeek } from '@/lib/time';

/** Whether this week's WFH plan is filled in, and which days are remote. */
export function useWeeklyPlan(employeeId: string | number | undefined) {
  const [weeklyPlanFilled, setWeeklyPlanFilled] = useState(true);
  const [weeklyPlanDays, setWeeklyPlanDays] = useState<string[]>([]);

  useEffect(() => {
    if (!employeeId) return;
    const weekStart = getMondayOfWeek(new Date());
    fetch(`/api/wfh-schedule?week=${weekStart}&employeeId=${employeeId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.length > 0) {
          setWeeklyPlanFilled(true);
          setWeeklyPlanDays(data[0].wfh_days || []);
        } else {
          setWeeklyPlanFilled(false);
        }
      })
      .catch(() => {});
  }, [employeeId]);

  const markPlanSaved = (days: string[]) => {
    setWeeklyPlanFilled(true);
    setWeeklyPlanDays(days);
  };

  return { weeklyPlanFilled, weeklyPlanDays, markPlanSaved };
}
