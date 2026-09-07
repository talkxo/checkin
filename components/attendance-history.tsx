"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface AttendanceHistoryProps {
  userSlug?: string;
  onDateSelect?: (date: Date) => void;
}

interface AttendanceData {
  checkinTime: string | null;
  checkoutTime: string | null;
  totalHours: string;
  status: 'active' | 'complete' | 'not_started';
  mode?: 'office' | 'remote';
}

interface MonthlyAttendanceData {
  date: string;
  hours: number;
  status: 'active' | 'complete' | 'not_started';
  checkinTime: string | null;
  checkinStatus: 'early' | 'on-time' | 'slightly-late' | 'late' | 'none';
}

export default function AttendanceHistory({ userSlug, onDateSelect }: AttendanceHistoryProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const daySelectorRef = useRef<HTMLDivElement>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceData[]>([]);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [viewMode, setViewMode] = useState<'1month' | '3months'>('1month');
  const [leaveDates, setLeaveDates] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const [monthSummaries, setMonthSummaries] = useState<
    Array<{ present: number; leave: number; holidays: number; hours: number }>
  >([]);

  // Generate days for current week
  const getWeekDays = (date: Date): Date[] => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(date.setDate(diff));
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays(new Date(selectedDate));

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  // Fetch attendance data for selected date
  const fetchAttendanceData = async (date: Date) => {
    if (!userSlug) {
      setError('User slug is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Format date as YYYY-MM-DD in IST to avoid timezone issues
      const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD format

      const response = await fetch(`/api/attendance/history?slug=${userSlug}&date=${dateStr}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      setAttendanceData(data);
      
      if (onDateSelect) {
        onDateSelect(date);
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data');
      setAttendanceData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Get all days in the current month
  const getMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Organize days into weeks (rows)
  const getWeeks = (days: Date[]): Date[][] => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Add empty cells for days before the first day of the month
    const firstDay = days[0];
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert to Monday = 0
    
    for (let i = 0; i < offset; i++) {
      currentWeek.push(new Date(0)); // Placeholder for empty cells
    }
    
    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add empty cells for remaining days in the last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(new Date(0)); // Placeholder
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  // Get months to display based on view mode
  const getMonthsToDisplay = (): Date[] => {
    const months: Date[] = [];
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (viewMode === '1month') {
      months.push(currentMonth);
    } else {
      // Last 3 months
      for (let i = 2; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(month);
      }
    }
    return months;
  };

  // Fetch monthly attendance data for heatmap
  const fetchMonthlyData = useCallback(async () => {
    if (!userSlug) return;

    setIsLoadingMonthly(true);
    try {
      const now = new Date();
      const monthsToFetch: { month: number; year: number }[] = [];
      
      if (viewMode === '1month') {
        monthsToFetch.push({ month: now.getMonth() + 1, year: now.getFullYear() });
      } else {
        for (let i = 2; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthsToFetch.push({ month: d.getMonth() + 1, year: d.getFullYear() });
        }
      }
      
      const allProcessedDays: MonthlyAttendanceData[] = [];
      // Leave/holiday data accumulates across the fetched months — each month
      // fetch returns only its own slice, so merging (not replacing) is what
      // keeps quarter view from losing other months' leave days.
      const mergedLeaves = new Set<string>();
      const mergedHolidays = new Map<string, string>();

      // Fetch each month in a single call
      await Promise.all(monthsToFetch.map(async ({ month, year }) => {
        try {
          const response = await fetch(`/api/attendance/monthly?month=${month}&year=${year}`);
          if (!response.ok) return;

          const { attendance, leaveDates: leaveKeys = [], holidays: holidayRows = [] } = await response.json();
          for (const key of leaveKeys) mergedLeaves.add(key);
          for (const h of holidayRows) mergedHolidays.set(h.date, h.name);
          
          // Fill in all days for this month
          const lastDay = new Date(year, month, 0).getDate();
          for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const data = attendance[dateStr];
            
            let checkinStatus: 'early' | 'on-time' | 'slightly-late' | 'late' | 'none' = 'none';
            let checkinTimeStr = null;
            let hours = 0;
            let status: any = 'not_started';

            if (data) {
              const checkinDate = new Date(data.checkinTime);
              checkinTimeStr = checkinDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
              
              const [h, m] = checkinTimeStr.split(':').map(Number);
              const minutes = h * 60 + m;
              
              if (minutes < 585) checkinStatus = 'early';
              else if (minutes < 615) checkinStatus = 'on-time';
              else if (minutes < 645) checkinStatus = 'slightly-late';
              else checkinStatus = 'late';

              status = data.checkoutTime ? 'complete' : 'active';
              
              // Calculate total hours
              let totalMs = 0;
              data.sessions.forEach((s: any) => {
                const start = new Date(s.checkin_ts).getTime();
                const end = s.checkout_ts ? new Date(s.checkout_ts).getTime() : Date.now();
                totalMs += end - start;
              });
              hours = totalMs / (1000 * 60 * 60);
            }

            allProcessedDays.push({
              date: dateStr,
              hours,
              status,
              checkinTime: checkinTimeStr,
              checkinStatus
            });
          }
        } catch (e) {
          console.error('Error fetching month:', month, year, e);
        }
      }));

      setMonthlyData(allProcessedDays);
      setLeaveDates(mergedLeaves);
      setHolidays(mergedHolidays);

      // Per-month summary — present / leave / holidays / hours logged
      setMonthSummaries(
        monthsToFetch.map(({ month, year }) => {
          const prefix = `${year}-${String(month).padStart(2, '0')}`;
          const days = allProcessedDays.filter((d) => d.date.startsWith(prefix));
          const present = days.filter((d) => d.status !== 'not_started').length;
          const leave = [...mergedLeaves].filter((k) => k.startsWith(prefix)).length;
          const holidaysInMonth = [...mergedHolidays.keys()].filter((k) => k.startsWith(prefix)).length;
          const hours = days.reduce((sum, d) => sum + d.hours, 0);
          return { present, leave, holidays: holidaysInMonth, hours: Math.round(hours * 10) / 10 };
        })
      );
    } catch (err) {
      console.error('Error fetching monthly data:', err);
    } finally {
      setIsLoadingMonthly(false);
    }
  }, [userSlug, viewMode]);

  // Fetch data when date or view mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetchAttendanceData(selectedDate);
    fetchMonthlyData();
  }, [selectedDate, userSlug, viewMode, fetchMonthlyData]);

  // Scroll to selected day in day selector
  useEffect(() => {
    if (daySelectorRef.current) {
      const selectedIndex = weekDays.findIndex(
        d => d.toDateString() === selectedDate.toDateString()
      );
      if (selectedIndex >= 0) {
        const dayElement = daySelectorRef.current.children[selectedIndex] as HTMLElement;
        if (dayElement) {
          dayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [selectedDate, weekDays]);

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  return (
    <div className="w-full space-y-6">
      {/* Monthly Attendance Heatmap */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-label">Calendar</h3>
            {viewMode === '1month' && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('1month')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === '1month'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('3months')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === '3months'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Quarter
            </button>
          </div>
        </div>
        <div className="min-h-[200px] transition-all duration-300 ease-in-out">
          {isLoadingMonthly ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading monthly data...</p>
            </div>
          ) : (
            <div 
              key={viewMode}
              className="space-y-6"
            >
              {getMonthsToDisplay().map((month, monthIdx) => (
              <div key={monthIdx} className="bg-card rounded-xl p-4 border border-border/50">
                {viewMode === '3months' && (
                  <h4 className="text-xs font-medium text-muted-foreground mb-3">
                    {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h4>
                )}
                {/* Day headers */}
                <div className="flex gap-1.5 mb-2.5">
                  <div className="w-8"></div> {/* Empty space for week labels */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <div 
                      key={day} 
                      className={`flex-1 text-center text-xs font-medium py-1 ${
                        idx >= 5 ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-foreground'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid - weeks as rows, days as columns */}
                <div className="flex flex-col gap-1.5">
                  {getWeeks(getMonthDays(month)).map((week, weekIdx) => (
                    <div key={weekIdx} className="flex gap-1.5 items-center">
                      {/* Week label (optional) */}
                      <div className="w-8 text-xs text-muted-foreground text-right pr-1">
                        {weekIdx + 1}
                      </div>
                      
                      {/* Days in week */}
                      {week.map((day, dayIdx) => {
                        const isPlaceholder = day.getTime() === 0;
                        const isWeekend = dayIdx >= 5; // Saturday (5) and Sunday (6)
                        
                        if (isPlaceholder) {
                          return (
                            <div
                              key={dayIdx}
                              className="flex-1 h-9 rounded-lg bg-transparent"
                            />
                          );
                        }
                        
                        // Format date as YYYY-MM-DD in IST to match API data
                        const istDateStr = day.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD format
                        const dayData = monthlyData.find(d => d.date === istDateStr);
                        const checkinStatus = dayData?.checkinStatus || 'none';
                        const status = dayData?.status || 'not_started';
                        const hours = dayData?.hours || 0;
                        const checkinTime = dayData?.checkinTime || null;
                        
                        // Determine color: leave > holiday > check-in status
                        const isOnLeave = leaveDates.has(istDateStr);
                        const holidayName = holidays.get(istDateStr);
                        let bgColor = isWeekend ? 'bg-muted/50' : 'bg-muted'; // Default greyed for weekends

                        if (isOnLeave) {
                          bgColor = isWeekend ? 'bg-primary/50' : 'bg-primary/70';
                        } else if (holidayName && checkinStatus === 'none') {
                          bgColor = isWeekend ? 'bg-sky-400/50' : 'bg-sky-500/70';
                        } else if (checkinStatus === 'none') {
                          // No check-in
                          bgColor = isWeekend ? 'bg-muted/50' : 'bg-muted';
                        } else {
                          // Show check-in status colors regardless of active status
                          // This ensures users see their check-in time color even when session is active
                          switch (checkinStatus) {
                            case 'early':
                            case 'on-time':
                              bgColor = isWeekend ? 'bg-success-300/70' : 'bg-success-500';
                              break;
                            case 'slightly-late':
                            case 'late':
                              bgColor = isWeekend ? 'bg-amber-400/70' : 'bg-amber-500';
                              break;
                            default:
                              if (status === 'active') {
                                bgColor = isWeekend ? 'bg-success-300/70' : 'bg-success-500';
                              } else {
                                bgColor = isWeekend ? 'bg-muted/50' : 'bg-muted';
                              }
                          }
                        }
                        
                        // Build tooltip text
                        const baseTooltip = checkinTime
                          ? `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}: ${checkinTime} (${checkinStatus === 'none' ? 'No check-in' : checkinStatus})${hours > 0 ? ` - ${hours.toFixed(1)}h` : ''}`
                          : `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}: No attendance`;
                        const tooltipText = isOnLeave
                          ? `${baseTooltip} · On leave`
                          : holidayName
                            ? `${baseTooltip}${checkinStatus === 'none' ? ` · Holiday: ${holidayName}` : ''}`
                            : baseTooltip;
                        
                        return (
                          <div
                            key={dayIdx}
                            className={`flex-1 h-9 rounded-lg transition-all duration-200 relative group cursor-pointer ${
                              isWeekend ? 'opacity-60' : ''
                            } ${bgColor}`}
                            title={tooltipText}
                          >
                            {/* Custom tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 elevation-lg">
                              {tooltipText}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-foreground"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Month summary — present / leave / holidays / hours */}
                {monthSummaries[monthIdx] && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-medium text-success-700 dark:text-success-400">
                      ✓ {monthSummaries[monthIdx].present} present
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      🌴 {monthSummaries[monthIdx].leave} leave
                    </span>
                    {monthSummaries[monthIdx].holidays > 0 && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                        🎉 {monthSummaries[monthIdx].holidays} {monthSummaries[monthIdx].holidays === 1 ? 'holiday' : 'holidays'}
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {monthSummaries[monthIdx].hours}h logged
                    </span>
                  </div>
                )}
              </div>
            ))}
            {/* Legend — compact */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success-500 inline-block" />
                <span className="text-[10px] text-muted-foreground">On time</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span className="text-[10px] text-muted-foreground">Late</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />
                <span className="text-[10px] text-muted-foreground">Leave</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500/70 inline-block" />
                <span className="text-[10px] text-muted-foreground">Holiday</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted inline-block" />
                <span className="text-[10px] text-muted-foreground">No data</span>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

