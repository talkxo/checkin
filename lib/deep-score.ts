// Canonical Deep Score — the single source of truth shared by the personal
// tile (/api/stats/punctuality) and the team leaderboard (/api/admin/leaderboard).
// Extracted verbatim from /api/stats/punctuality so every surface shows the
// same number.
import { nowIST } from './time';

export interface ScoredSession {
  checkin_ts: string;
  checkout_ts: string | null;
  mode: string | null;
}

export interface DayScore {
  dateKey: string;
  checkinTime: number; // minutes from midnight, IST
  checkoutTime: number | null;
  hoursWorked: number;
  mode: string;
  baseScore: number; // 0-3 by check-in time
  hoursBonus: number; // 0-0.5
  checkoutBonus: number; // 0-0.3
  modeBonus: number; // 0-0.2
  totalScore: number; // capped at 3/day
}

export interface DeepScoreWindow {
  start: Date; // UTC lower bound for session queries
  end: Date; // UTC upper bound for session queries
  istNow: Date; // IST wall clock
  windowStartIST: Date; // IST midnight, windowDays days ago
}

export interface DeepScoreResult {
  dayScores: DayScore[]; // sorted by dateKey ascending
  punctualityScore: number; // day totals + consistency + streak bonus, capped at windowDays*3
  consistencyBonus: number;
  streakBonus: number;
  noFillDays: number;
  avgCheckinTimeMinutes: number;
}

const istWallClock = (d: Date) => new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

/** Rolling IST window: windowDays calendar days back from today, 00:00 to 23:59:59.999 IST. */
export function deepScoreWindow(windowDays = 14, now: Date = nowIST()): DeepScoreWindow {
  const istNow = istWallClock(now);
  const windowStartIST = new Date(istNow);
  windowStartIST.setDate(istNow.getDate() - windowDays);
  windowStartIST.setHours(0, 0, 0, 0);
  const endIST = new Date(istNow);
  endIST.setHours(23, 59, 59, 999);
  return {
    start: new Date(windowStartIST.toLocaleString('en-US', { timeZone: 'UTC' })),
    end: new Date(endIST.toLocaleString('en-US', { timeZone: 'UTC' })),
    istNow,
    windowStartIST,
  };
}

const scoreHoursBonus = (h: number) => (h >= 8 ? 0.5 : h >= 6 ? 0.3 : h >= 4 ? 0.1 : 0);
const scoreCheckoutBonus = (c: number | null) =>
  c === null ? 0 : c >= 1020 ? 0.3 : c >= 960 ? 0.2 : c >= 900 ? 0.1 : 0;

export function computeDeepScore(
  sessions: ScoredSession[],
  opts: { windowDays?: number; now?: Date } = {}
): DeepScoreResult {
  const windowDays = opts.windowDays ?? 14;
  const now = opts.now ?? nowIST();
  const istNow = istWallClock(now);
  const nowMinutes = istNow.getHours() * 60 + istNow.getMinutes();

  const dayMap = new Map<string, DayScore>();

  // Earliest check-in per day wins the base score; later sessions only lift
  // the hours/checkout bonuses.
  sessions.forEach((session) => {
    const istCheckin = istWallClock(new Date(session.checkin_ts));
    const checkinTime = istCheckin.getHours() * 60 + istCheckin.getMinutes();
    const dateKey = istCheckin.toISOString().split('T')[0];

    let checkoutTime: number | null = null;
    let hoursWorked = 0;
    if (session.checkout_ts) {
      const istCheckout = istWallClock(new Date(session.checkout_ts));
      checkoutTime = istCheckout.getHours() * 60 + istCheckout.getMinutes();
      hoursWorked = (checkoutTime - checkinTime) / 60;
    } else {
      // Still checked in — count hours until now.
      hoursWorked = (nowMinutes - checkinTime) / 60;
    }

    const existing = dayMap.get(dateKey);
    if (!existing || existing.checkinTime > checkinTime) {
      let baseScore = 0;
      if (checkinTime < 615) baseScore = 3; // before 10:15 AM
      else if (checkinTime < 645) baseScore = 2; // 10:15-10:45 AM
      else if (checkinTime < 1020) baseScore = 1; // before 5 PM
      else baseScore = 0.5; // after 5 PM

      const hoursBonus = scoreHoursBonus(hoursWorked);
      const checkoutBonus = scoreCheckoutBonus(checkoutTime);
      const modeBonus = session.mode === 'office' ? 0.2 : 0.1;

      dayMap.set(dateKey, {
        dateKey,
        checkinTime,
        checkoutTime,
        hoursWorked,
        mode: session.mode || 'remote',
        baseScore,
        hoursBonus,
        checkoutBonus,
        modeBonus,
        totalScore: Math.min(3, baseScore + hoursBonus + checkoutBonus + modeBonus),
      });
    } else if (hoursWorked > existing.hoursWorked) {
      existing.hoursWorked = hoursWorked;
      existing.checkoutTime = checkoutTime;
      existing.hoursBonus = scoreHoursBonus(hoursWorked);
      existing.checkoutBonus = scoreCheckoutBonus(checkoutTime);
      existing.totalScore = Math.min(
        3,
        existing.baseScore + existing.hoursBonus + existing.checkoutBonus + existing.modeBonus
      );
    }
  });

  const dayScores = Array.from(dayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  // Consistency bonus — tight check-in spread pays up to +2.
  let consistencyBonus = 0;
  if (dayScores.length >= 3) {
    const times = dayScores.map((d) => d.checkinTime);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 30) consistencyBonus = 2;
    else if (stdDev < 60) consistencyBonus = 1;
    else if (stdDev < 90) consistencyBonus = 0.5;
  }

  // Streak bonus — consecutive on-time days within the window pay up to +1.5.
  let streakBonus = 0;
  let run = 0;
  dayScores.forEach((day) => {
    if (day.baseScore >= 3) {
      run += 1;
      if (run >= 7) streakBonus = Math.max(streakBonus, 1.5);
      else if (run >= 5) streakBonus = Math.max(streakBonus, 1);
      else if (run >= 3) streakBonus = Math.max(streakBonus, 0.5);
    } else {
      run = 0;
    }
  });

  const dayTotal = dayScores.reduce((sum, d) => sum + d.totalScore, 0);
  const avgCheckinTimeMinutes = dayScores.length
    ? dayScores.reduce((sum, d) => sum + d.checkinTime, 0) / dayScores.length
    : 0;

  return {
    dayScores,
    punctualityScore: Math.min(windowDays * 3, dayTotal + consistencyBonus + streakBonus),
    consistencyBonus,
    streakBonus,
    noFillDays: windowDays - dayScores.length,
    avgCheckinTimeMinutes,
  };
}
