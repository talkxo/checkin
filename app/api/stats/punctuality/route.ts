import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';
    
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    // Find employee
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (!emp) {
      return NextResponse.json({ error: 'employee not found' }, { status: 404 });
    }

    // Get last 14 days in IST
    const now = nowIST();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const fourteenDaysAgo = new Date(istNow);
    fourteenDaysAgo.setDate(istNow.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const todayEnd = new Date(istNow);
    todayEnd.setHours(23, 59, 59, 999);

    // Convert IST boundaries to UTC for querying
    const start = new Date(fourteenDaysAgo.toLocaleString('en-US', { timeZone: 'UTC' }));
    const end = new Date(todayEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Get all sessions in last 14 days with checkout and mode info
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('checkin_ts, checkout_ts, mode')
      .eq('employee_id', emp.id)
      .gte('checkin_ts', start.toISOString())
      .lte('checkin_ts', end.toISOString())
      .order('checkin_ts', { ascending: true });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Complex Deep Score System (out of 42 = 3 points per day for 14 days)
    // Scoring includes multiple parameters:
    // 1. Check-in timeliness (base score)
    // 2. Hours worked (bonus for full day work)
    // 3. Check-out behavior (bonus for proper check-out)
    // 4. Consistency (bonus for consistent check-in times)
    // 5. Mode preference (slight bonus for office mode)
    // 6. Streak bonuses (consecutive on-time days)
    
    interface DayScore {
      dateKey: string;
      checkinTime: number; // minutes from midnight
      checkoutTime: number | null;
      hoursWorked: number;
      mode: string;
      baseScore: number; // 0-3 based on check-in time
      hoursBonus: number; // 0-0.5 bonus for full hours
      checkoutBonus: number; // 0-0.3 bonus for proper checkout
      modeBonus: number; // 0-0.2 bonus for office mode
      totalScore: number;
    }

    const dayScores = new Map<string, DayScore>();
    const checkInTimes: number[] = [];

    // Process all sessions and get the earliest check-in per day
    sessions?.forEach((session) => {
      const checkinTime = new Date(session.checkin_ts);
      const istCheckin = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const checkinHour = istCheckin.getHours();
      const checkinMinute = istCheckin.getMinutes();
      const checkinTimeMinutes = checkinHour * 60 + checkinMinute;
      const dateKey = istCheckin.toISOString().split('T')[0];

      // Calculate hours worked
      let hoursWorked = 0;
      let checkoutTimeMinutes: number | null = null;
      if (session.checkout_ts) {
        const checkoutTime = new Date(session.checkout_ts);
        const istCheckout = new Date(checkoutTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        checkoutTimeMinutes = istCheckout.getHours() * 60 + istCheckout.getMinutes();
        hoursWorked = (checkoutTimeMinutes - checkinTimeMinutes) / 60;
      } else {
        // If still checked in, calculate hours until now
        const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const nowMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
        hoursWorked = (nowMinutes - checkinTimeMinutes) / 60;
      }

      // Get or create day score
      if (!dayScores.has(dateKey) || dayScores.get(dateKey)!.checkinTime > checkinTimeMinutes) {
        // Base score based on check-in time
        let baseScore = 0;
        if (checkinTimeMinutes < 600) {
          baseScore = 3; // On-time (before 10 AM)
        } else if (checkinTimeMinutes < 660) {
          baseScore = 2; // Slightly late (10-11 AM)
        } else if (checkinTimeMinutes < 1020) {
          baseScore = 1; // Late but before 5 PM
        } else {
          baseScore = 0.5; // Very late (after 5 PM)
        }

        // Hours worked bonus (0-0.5 points)
        // Full day = 8+ hours gets 0.5, 6-8 hours gets 0.3, 4-6 hours gets 0.1
        let hoursBonus = 0;
        if (hoursWorked >= 8) {
          hoursBonus = 0.5;
        } else if (hoursWorked >= 6) {
          hoursBonus = 0.3;
        } else if (hoursWorked >= 4) {
          hoursBonus = 0.1;
        }

        // Check-out bonus (0-0.3 points)
        // Proper check-out (after 5 PM) gets bonus
        let checkoutBonus = 0;
        if (checkoutTimeMinutes !== null) {
          if (checkoutTimeMinutes >= 1020) { // After 5 PM
            checkoutBonus = 0.3;
          } else if (checkoutTimeMinutes >= 960) { // After 4 PM
            checkoutBonus = 0.2;
          } else if (checkoutTimeMinutes >= 900) { // After 3 PM
            checkoutBonus = 0.1;
          }
        }

        // Mode bonus (0-0.2 points)
        // Office mode gets slight bonus
        const modeBonus = session.mode === 'office' ? 0.2 : 0.1;

        const totalScore = Math.min(3, baseScore + hoursBonus + checkoutBonus + modeBonus);

        dayScores.set(dateKey, {
          dateKey,
          checkinTime: checkinTimeMinutes,
          checkoutTime: checkoutTimeMinutes,
          hoursWorked,
          mode: session.mode || 'remote',
          baseScore,
          hoursBonus,
          checkoutBonus,
          modeBonus,
          totalScore
        });
      } else {
        // Update existing day score if this session has better metrics
        const existing = dayScores.get(dateKey)!;
        if (hoursWorked > existing.hoursWorked) {
          existing.hoursWorked = hoursWorked;
          existing.checkoutTime = checkoutTimeMinutes;
          // Recalculate bonuses
          if (hoursWorked >= 8) {
            existing.hoursBonus = 0.5;
          } else if (hoursWorked >= 6) {
            existing.hoursBonus = 0.3;
          } else if (hoursWorked >= 4) {
            existing.hoursBonus = 0.1;
          }
          if (checkoutTimeMinutes !== null && checkoutTimeMinutes >= 1020) {
            existing.checkoutBonus = 0.3;
          } else if (checkoutTimeMinutes !== null && checkoutTimeMinutes >= 960) {
            existing.checkoutBonus = 0.2;
          } else if (checkoutTimeMinutes !== null && checkoutTimeMinutes >= 900) {
            existing.checkoutBonus = 0.1;
          }
          existing.totalScore = Math.min(3, existing.baseScore + existing.hoursBonus + existing.checkoutBonus + existing.modeBonus);
        }
      }
    });

    // Calculate consistency bonus (bonus for consistent check-in times)
    const sortedDays = Array.from(dayScores.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    let consistencyBonus = 0;
    if (sortedDays.length >= 3) {
      const checkinTimes = sortedDays.map(d => d.checkinTime);
      const mean = checkinTimes.reduce((a, b) => a + b, 0) / checkinTimes.length;
      const variance = checkinTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / checkinTimes.length;
      const stdDev = Math.sqrt(variance);
      // Lower standard deviation = more consistent = higher bonus (max 2 points)
      if (stdDev < 30) consistencyBonus = 2; // Very consistent
      else if (stdDev < 60) consistencyBonus = 1; // Moderately consistent
      else if (stdDev < 90) consistencyBonus = 0.5; // Somewhat consistent
    }

    // Calculate streak bonus (consecutive on-time days)
    let streakBonus = 0;
    let currentStreak = 0;
    sortedDays.forEach(day => {
      if (day.baseScore >= 3) { // On-time
        currentStreak++;
        if (currentStreak >= 7) streakBonus = Math.max(streakBonus, 1.5); // 7+ day streak
        else if (currentStreak >= 5) streakBonus = Math.max(streakBonus, 1); // 5+ day streak
        else if (currentStreak >= 3) streakBonus = Math.max(streakBonus, 0.5); // 3+ day streak
      } else {
        currentStreak = 0;
      }
    });

    // Calculate total deep score
    let punctualityScore = 0;
    sortedDays.forEach(day => {
      punctualityScore += day.totalScore;
      checkInTimes.push(day.checkinTime);
    });

    // Add consistency and streak bonuses (capped at 42 total)
    punctualityScore = Math.min(42, punctualityScore + consistencyBonus + streakBonus);

    // Calculate no-fill days
    const totalDays = 14;
    const daysWithCheckIn = dayScores.size;
    const noFillDays = totalDays - daysWithCheckIn;

    // Calculate average check-in time from sorted days
    let avgCheckinTime = 0;
    let avgCheckinTimeFormatted = '--:--';
    if (checkInTimes.length > 0) {
      avgCheckinTime = checkInTimes.reduce((sum, time) => sum + time, 0) / checkInTimes.length;
      const avgHours = Math.floor(avgCheckinTime / 60);
      const avgMinutes = Math.floor(avgCheckinTime % 60);
      avgCheckinTimeFormatted = `${avgHours.toString().padStart(2, '0')}:${avgMinutes.toString().padStart(2, '0')}`;
    }

    // Get today's check-in time for comparison
    const todayStartForQuery = new Date(istNow);
    todayStartForQuery.setHours(0, 0, 0, 0);
    const todayEndForQuery = new Date(istNow);
    todayEndForQuery.setHours(23, 59, 59, 999);
    
    const todayStartUTC = new Date(todayStartForQuery.toLocaleString('en-US', { timeZone: 'UTC' }));
    const todayEndUTC = new Date(todayEndForQuery.toLocaleString('en-US', { timeZone: 'UTC' }));

    const { data: todaySession } = await supabaseAdmin
      .from('sessions')
      .select('checkin_ts')
      .eq('employee_id', emp.id)
      .gte('checkin_ts', todayStartUTC.toISOString())
      .lte('checkin_ts', todayEndUTC.toISOString())
      .order('checkin_ts', { ascending: true })
      .limit(1)
      .maybeSingle();

    let todayCheckinTime: number | null = null;
    let checkinStatus: 'early' | 'late' | 'on-time' | null = null;

    if (todaySession?.checkin_ts) {
      const todayCheckin = new Date(todaySession.checkin_ts);
      const istTodayCheckin = new Date(todayCheckin.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      todayCheckinTime = istTodayCheckin.getHours() * 60 + istTodayCheckin.getMinutes();
      
      if (avgCheckinTime > 0) {
        if (todayCheckinTime < avgCheckinTime - 30) {
          checkinStatus = 'early';
        } else if (todayCheckinTime > avgCheckinTime + 30) {
          checkinStatus = 'late';
        } else {
          checkinStatus = 'on-time';
        }
      }
    }

    return NextResponse.json({
      punctualityScore,
      maxScore: 42, // 14 days * 3 points per day
      noFillDays,
      avgCheckinTime: avgCheckinTimeFormatted,
      avgCheckinTimeMinutes: avgCheckinTime,
      todayCheckinTime: todayCheckinTime ? `${Math.floor(todayCheckinTime / 60).toString().padStart(2, '0')}:${(todayCheckinTime % 60).toString().padStart(2, '0')}` : null,
      checkinStatus
    });

  } catch (error) {
    console.error('Error in deep score stats API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

