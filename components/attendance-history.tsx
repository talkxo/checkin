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
      // Get months to display based on view mode
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
      
      // Helper function to get days in a month
      const getDaysInMonth = (date: Date): Date[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const lastDay = new Date(year, month + 1, 0);
        const days: Date[] = [];
        for (let i = 1; i <= lastDay.getDate(); i++) {
          days.push(new Date(year, month, i));
        }
        return days;
      };
      
      const allDays: Date[] = [];
      months.forEach(month => {
        allDays.push(...getDaysInMonth(month));
      });
      
      const monthDays = allDays;

      // Fetch data for each day in the month
      const promises = monthDays.map(async (day) => {
        // Format date as YYYY-MM-DD in IST to avoid timezone issues
        const dateStr = day.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD format
        
        try {
          const response = await fetch(`/api/attendance/history?slug=${userSlug}&date=${dateStr}`);
          if (response.ok) {
            const data = await response.json();
            // Parse hours from "Xh Ym" format
            const hoursMatch = data.totalHours.match(/(\d+)h\s*(\d+)?m?/);
            const hours = hoursMatch 
              ? parseInt(hoursMatch[1]) + (hoursMatch[2] ? parseInt(hoursMatch[2]) / 60 : 0)
              : 0;
            
            // Determine check-in status based on check-in time
            let checkinStatus: 'early' | 'on-time' | 'slightly-late' | 'late' | 'none' = 'none';
            if (data.checkinTime) {
              // Parse check-in time (format: "HH:MM")
              const [checkinHour, checkinMinute] = data.checkinTime.split(':').map(Number);
              const checkinTimeMinutes = checkinHour * 60 + checkinMinute;
              
              // Before 9:45 AM = early
              // 9:45-10:15 AM = on-time
              // 10:15-10:45 AM = slightly-late
              // After 10:45 AM = late
              if (checkinTimeMinutes < 585) { // Before 9:45
                checkinStatus = 'early';
              } else if (checkinTimeMinutes < 615) { // 9:45-10:15
                checkinStatus = 'on-time';
              } else if (checkinTimeMinutes < 645) { // 10:15-10:45
                checkinStatus = 'slightly-late';
              } else { // After 10:45
                checkinStatus = 'late';
              }
            }
            
            return {
              date: dateStr,
              hours,
              status: data.status,
              checkinTime: data.checkinTime,
              checkinStatus
            };
          }
        } catch (err) {
          console.error(`Error fetching data for ${dateStr}:`, err);
        }
        
        return {
          date: dateStr,
          hours: 0,
          status: 'not_started' as const,
          checkinTime: null,
          checkinStatus: 'none' as const
        };
      });

      const monthlyData = await Promise.all(promises);
      setMonthlyData(monthlyData);
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
          <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
            {viewMode === '1month' 
              ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : 'This Quarter'}
          </h3>
          <div className="flex gap-2 bg-muted dark:bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('1month')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === '1month'
                  ? 'bg-background dark:bg-background text-foreground dark:text-foreground shadow-sm elevation-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setViewMode('3months')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === '3months'
                  ? 'bg-background dark:bg-background text-foreground dark:text-foreground shadow-sm elevation-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              This Quarter
            </button>
          </div>
        </div>
        <div className="min-h-[200px] transition-all duration-300 ease-in-out">
          {isLoadingMonthly ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Loading monthly data...</p>
            </div>
          ) : (
            <div 
              key={viewMode}
              className="space-y-6"
            >
              {getMonthsToDisplay().map((month, monthIdx) => (
              <div key={monthIdx} className="bg-card dark:bg-card rounded-xl p-5 border border-border/50 dark:border-border elevation-md">
                {viewMode === '3months' && (
                  <h4 className="text-md font-semibold text-foreground dark:text-foreground mb-4">
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
                        
                        // Determine color based on check-in status
                        // Priority: checkinStatus > active status
                        // Show check-in status colors even when session is active
                        let bgColor = isWeekend ? 'bg-muted/50' : 'bg-muted'; // Default greyed for weekends
                        
                        if (checkinStatus === 'none') {
                          // No check-in
                          bgColor = isWeekend ? 'bg-muted/50' : 'bg-muted';
                        } else {
                          // Show check-in status colors regardless of active status
                          // This ensures users see their check-in time color even when session is active
                          switch (checkinStatus) {
                            case 'early':
                              bgColor = isWeekend ? 'bg-blue-300' : 'bg-blue-400'; // Blue for early
                              break;
                            case 'on-time':
                              bgColor = isWeekend ? 'bg-green-500' : 'bg-green-600'; // Green for on-time
                              break;
                            case 'slightly-late':
                              bgColor = isWeekend ? 'bg-yellow-400' : 'bg-yellow-500'; // Yellow for slightly late
                              break;
                            case 'late':
                              bgColor = isWeekend ? 'bg-orange-500' : 'bg-orange-600'; // Orange for late
                              break;
                            default:
                              // Fallback: if status is active but no check-in status, show yellow
                              if (status === 'active') {
                                bgColor = isWeekend ? 'bg-yellow-300' : 'bg-yellow-400';
                              } else {
                                bgColor = isWeekend ? 'bg-muted/50' : 'bg-muted';
                              }
                          }
                        }
                        
                        // Build tooltip text
                        const tooltipText = checkinTime 
                          ? `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}: ${checkinTime} (${checkinStatus === 'none' ? 'No check-in' : checkinStatus})${hours > 0 ? ` - ${hours.toFixed(1)}h` : ''}`
                          : `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}: No attendance`;
                        
                        return (
                          <div
                            key={dayIdx}
                            className={`flex-1 h-9 rounded-lg transition-all duration-200 relative group cursor-pointer hover:scale-105 ${
                              isWeekend ? 'opacity-60' : ''
                            } ${bgColor}`}
                            title={tooltipText}
                          >
                            {/* Custom tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 elevation-lg">
                              {tooltipText}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

