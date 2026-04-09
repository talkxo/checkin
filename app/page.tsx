"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Bell, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import AssistantChat from '@/components/assistant-chat';
import PinLogin from '@/components/pin-login';
import PinChangeModal from '@/components/pin-change-modal';
import StatusBadge from '@/components/status-badge';
import OverviewCard from '@/components/overview-card';
import RecentActivity from '@/components/recent-activity';
import AttendanceHistory from '@/components/attendance-history';
import DarkModeToggle from '@/components/dark-mode-toggle';
import PresenceStrip from '@/components/presence-strip';
import TodayPresenceCard from '@/components/today-presence-card';
import WFHPlannerTab from '@/components/wfh-planner-tab';
import WeekStrip from '@/components/week-strip';
import LeaveManagement from '@/components/leave-management';
import { fireCheckInConfetti, fireCheckOutConfetti, fireOnTimeEmojis, fireLateCheckInPuff } from '@/lib/use-reward';
import { getMondayOfWeek } from '@/lib/time';
import ScoreBreakdownModal from '@/components/score-breakdown-modal';

// Feature flags — set to true to re-enable
const FEATURE_AI_ENABLED = false;

// Helper to check if today is a work day (Mon-Fri)
const isWorkDay = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

// Helper for push notification subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

// Helper function to format IST times consistently
const formatISTTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  }
};

const formatISTTimeShort = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
};

// Helper to format time consistently for display
const formatDisplayTime = (timeString: string) => {
  if (!timeString) return 'N/A';
  if (timeString.includes(':')) return timeString; // Already formatted
  return formatISTTimeShort(timeString);
};

export default function HomePage(){
  const [name,setName]=useState('');
  const [pending,setPending]=useState(false);
  const [msg,setMsg]=useState('');
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [meYesterday, setMeYesterday] = useState<any>(null);
  const [hasOpen, setHasOpen] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<{ daysOnTime: number; totalHours: number } | null>(null);
  const [punctualityStats, setPunctualityStats] = useState<{
    punctualityScore: number;
    maxScore: number;
    noFillDays: number;
    avgCheckinTime: string;
    checkinStatus: 'early' | 'late' | 'on-time' | null;
    dayBreakdown?: Array<{
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
    }>;
    consistencyBonus?: number;
    streakBonus?: number;
    windowDates?: string[];
  } | null>(null);
  const [breakdownModal, setBreakdownModal] = useState<'deepScore' | 'noFill' | null>(null);
  const [todaySummary, setTodaySummary] = useState<any[]>([]);
  const [yesterdaySummary, setYesterdaySummary] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNameInput, setShowNameInput] = useState(true);
  const [location, setLocation] = useState<string>('');
  const [isTodayAttendanceOpen, setIsTodayAttendanceOpen] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'team' | 'leave'>('control');
  const [streak, setStreak] = useState(0);
  const [weeklyPlanFilled, setWeeklyPlanFilled] = useState(true);
  const [weeklyPlanDays, setWeeklyPlanDays] = useState<string[]>([]);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [lateCheckIn, setLateCheckIn] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [aiNotification, setAiNotification] = useState<string>('');
  const [greetingMessage, setGreetingMessage] = useState<string>('Time to do what you do best');
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [moodComment, setMoodComment] = useState<string>('');
  const [autoCheckoutWarning, setAutoCheckoutWarning] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);
  const plannerEmployeeId =
    me?.id ||
    me?.employee?.id ||
    currentSession?.session?.employee_id ||
    selectedEmployee?.id ||
    (typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null) ||
    undefined;
  
  // Reminder state
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('remindersEnabled');
      return stored !== null ? stored === 'true' : true; // Default: enabled
    }
    return true;
  });

  // Hold button state
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Hold button handlers
  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldProgress(0);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }

    // Start AI response generation when hold begins
    if (FEATURE_AI_ENABLED && holdProgress === 0) {
      const context = hasOpen
        ? `User is about to check out. Current session: ${me?.workedMinutes || 0} minutes worked.`
        : `User is about to check in. Mode: ${mode}.`;

      generateSmartNotification(context);
    }

    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          setIsHolding(false);
          // Trigger the action when hold is complete
          if (hasOpen) {
            checkout();
          } else {
            act(mode);
          }
          return 100;
        }
        return prev + 2; // Complete in ~2.5 seconds
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHolding, hasOpen, mode, holdProgress, me?.workedMinutes]);



  // Generate AI-powered greeting message
  const generateGreetingMessage = async () => {
    if (!name || !isLoggedIn) return;
    
    try {
      const response = await fetch('/api/ai/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userData: { full_name: name },
          context: 'starting their workday and needs a short, funny, yet motivational greeting message (max 10 words, be creative and playful)'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notification) {
          // Extract just the greeting part (first sentence or first 10 words)
          const message = data.notification.split('.')[0].trim();
          if (message.length > 0 && message.length < 100) {
            setGreetingMessage(message);
          }
        }
      }
    } catch (error) {
      console.warn('AI greeting error (non-blocking):', error);
      // Keep default message on error
    }
  };

  // Generate AI-powered smart notification
  const generateSmartNotification = async (context: string) => {
    if (!me) return;
    
    try {
      if (process.env.NODE_ENV === 'development') console.log('Generating AI notification for context:', context.substring(0, 100) + '...');
      
      const response = await fetch('/api/ai/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userData: me,
          context 
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') console.log('AI notification received:', data.notification?.substring(0, 100) + '...');
        setAiNotification(data.notification);
        // Don't auto-clear AI notifications - let user see them
      } else {
        console.warn('AI notification request failed:', response.status);
      }
    } catch (error) {
      console.warn('AI notification error (non-blocking):', error);
      // Silently fail - AI notifications are optional and shouldn't break the main flow
    }
  };

  useEffect(()=>{
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      const saved = (localStorage.getItem('mode') as any) || 'office';
      setMode(saved);
      
      // Check for existing session
      const session = localStorage.getItem('currentSession');
      const savedName = localStorage.getItem('userName');
      
      if (session && savedName) {
        try {
          const sessionData = JSON.parse(session);
          
          // Validate session data structure
          if (!sessionData || !sessionData.employee || !sessionData.employee.slug) {
            throw new Error('Invalid session data structure');
          }
          
          setCurrentSession(sessionData);
          setName(savedName);
          setIsLoggedIn(true);
          setShowNameInput(false);
          setSelectedEmployee(sessionData.employee);
          // Set me immediately from session so tabs work before API resolves
          setMe((prev: any) => prev || { id: sessionData.employee.id, full_name: sessionData.employee.full_name || savedName, slug: sessionData.employee.slug });

          // Ensure UI leaves loading state immediately
          setIsLoading(false);

          // Check if session is still open (non-blocking)
          checkSessionStatus(sessionData.employee.slug).catch(err => {
            console.error('Error checking session status:', err);
          });

          // Fetch personal logs consistently on restore (non-blocking)
          const slug = sessionData.employee.slug;
          fetchMySummary(slug, true).catch(err => console.error('Error fetching summary:', err));
          fetchMySummaryYesterday(slug, true).catch(err => console.error('Error fetching yesterday summary:', err));
          fetchLeaveBalance(slug).catch(err => console.error('Error fetching leave balance:', err));
          fetchMonthlyStats(slug).catch(err => console.error('Error fetching monthly stats:', err));
          fetchPunctualityStats(slug).catch(err => console.error('Error fetching deep score stats:', err));
        } catch (e) {
          console.error('Error parsing session data:', e);
          localStorage.removeItem('currentSession');
          localStorage.removeItem('userName');
          setIsLoading(false);
        }
      } else if (savedName) {
        // User is logged in but no active session
        // Try to get the slug from localStorage
        const savedSlug = typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null;
        
        setName(savedName);
        setIsLoggedIn(true);
        setShowNameInput(false);
        
        // Ensure UI leaves loading state immediately
        setIsLoading(false);
        
        // If we have a slug, try to reconstruct the selectedEmployee object and check session
        if (savedSlug) {
          const savedId = localStorage.getItem('employeeId');
          const restoredEmployee = { id: savedId, full_name: savedName, slug: savedSlug };
          setSelectedEmployee(restoredEmployee);
          setMe((prev: any) => prev || restoredEmployee);
          // Check if there's an open session (non-blocking)
          checkSessionStatus(savedSlug).catch(err => console.error('Error checking session status:', err));
          fetchMySummary(savedSlug, true).catch(err => console.error('Error fetching summary:', err));
          fetchMySummaryYesterday(savedSlug, true).catch(err => console.error('Error fetching yesterday summary:', err));
          fetchLeaveBalance(savedSlug).catch(err => console.error('Error fetching leave balance:', err));
          fetchMonthlyStats(savedSlug).catch(err => console.error('Error fetching monthly stats:', err));
          fetchPunctualityStats(savedSlug).catch(err => console.error('Error fetching deep score stats:', err));
        } else {
          // No slug available, use full name
          fetchMySummary(savedName, false).catch(err => console.error('Error fetching summary:', err));
          fetchMySummaryYesterday(savedName, false).catch(err => console.error('Error fetching yesterday summary:', err));
        }
      } else {
        setIsLoading(false);
      }
      
      // Get location on app load (non-blocking)
      getCurrentLocation();
    } catch (error) {
      console.error('Error in initialization useEffect:', error);
      setIsLoading(false);
    }
  },[]);

  // Compute streak for Team tab from recent IST check-in dates.
  useEffect(() => {
    if (!isLoggedIn) {
      setStreak(0);
      return;
    }

    const activeSlug =
      selectedEmployee?.slug ||
      me?.slug ||
      (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null);

    if (!activeSlug) {
      setStreak(0);
      return;
    }

    const toDateKey = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const previousWorkday = (date: Date) => {
      const cursor = new Date(date);
      do {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6);
      return cursor;
    };

    const computeStreakFromDates = (dateKeys: string[]) => {
      const uniqueKeys = Array.from(new Set(dateKeys)).sort((a, b) => b.localeCompare(a));
      if (uniqueKeys.length === 0) return 0;

      const [year, month, day] = uniqueKeys[0].split('-').map(Number);
      let cursor = new Date(Date.UTC(year, month - 1, day));
      let days = 0;

      for (let i = 0; i < 366; i++) {
        const key = toDateKey(cursor);
        if (!uniqueKeys.includes(key)) break;
        days += 1;
        cursor = previousWorkday(cursor);
      }

      return days;
    };

    const fetchStreak = async () => {
      try {
        const response = await fetch(`/api/admin/recent-activity?range=month&slug=${encodeURIComponent(activeSlug)}`);
        if (!response.ok) {
          setStreak(0);
          return;
        }

        const data = await response.json();
        const dateKeys = (data.recentActivity || []).map((item: any) =>
          new Date(item.checkinTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        );
        setStreak(computeStreakFromDates(dateKeys));
      } catch {
        setStreak(0);
      }
    };

    fetchStreak();
  }, [isLoggedIn, me?.slug, selectedEmployee?.slug]);

  // Get current location and determine mode
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation('Location not available');
      return;
    }

    setIsLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Check if user is in the office (exact coordinates)
        // Office coordinates: 28.44388735° N, 77.05672206834356° E
        const officeLat = 28.44388735;
        const officeLng = 77.05672206834356;
        const radius = 0.01; // ~1km radius

        const distance = Math.sqrt(
          Math.pow(latitude - officeLat, 2) + Math.pow(longitude - officeLng, 2)
        );

        if (distance <= radius) {
          setMode('office');
          setLocation('Office Location');
        } else {
          setMode('remote');
          setLocation('Remote Location');
        }
        setIsLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocation('Location unavailable');
        setMode('remote'); // Default to remote if location fails
        setIsLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer effect for elapsed time (hidden from UI but still tracked)
  useEffect(() => {
    if (!currentSession || !hasOpen) {
      setElapsedTime(0);
      return;
    }

    const update = () => {
      const start = new Date(currentSession.session.checkin_ts).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedTime(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [currentSession?.session?.checkin_ts, hasOpen]);

  // Hold progress effect with AI initiation
  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }

    // Start AI response generation when hold begins
    if (FEATURE_AI_ENABLED && holdProgress === 0) {
      const context = hasOpen
        ? `User is about to check out. Current session: ${me?.workedMinutes || 0} minutes worked.`
        : `User is about to check in. Mode: ${mode}.`;

      generateSmartNotification(context);
    }

    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          setIsHolding(false);
          // Trigger the action when hold is complete
          if (hasOpen) {
            checkout();
          } else {
            act(mode);
          }
          return 100;
        }
        return prev + 2; // Complete in ~2.5 seconds
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHolding, hasOpen, mode, holdProgress, me?.workedMinutes]);

  const checkSessionStatus = async (slug: string) => {
    try {
      const r = await fetch(`/api/session/open?slug=${slug}`);
      const data = await r.json();

      if (data.ok && data.session) {
        setCurrentSession(data);
        setHasOpen(true);
      } else {
        setHasOpen(false);
        setCurrentSession(null);
      }
    } catch (e) {
      console.error('Error checking session status:', e);
      setHasOpen(false);
      setCurrentSession(null);
    }
  };

  const searchEmployees = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const r = await fetch(`/api/employees?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Error searching employees:', e);
      setSuggestions([]);
    }
  };

  const fetchMySummary = async (identifier: string, useSlug: boolean = false) => {
    try {
      // Auto-detect if identifier looks like a slug (contains hyphens, lowercase)
      const looksLikeSlug = identifier.includes('-') && identifier === identifier.toLowerCase();
      const shouldUseSlug = useSlug || looksLikeSlug;

      const param = shouldUseSlug ? `slug=${identifier}` : `fullName=${encodeURIComponent(identifier)}`;

      const r = await fetch(`/api/summary/me?${param}`);

      if (!r.ok) return;

      const data = await r.json();
      setMe({
        ...data,
        ...data.employee,
        employeeId: data.employee?.id,
      });
    } catch (e) {
      console.error('Error fetching my summary:', e);
    }
  };

  const fetchMySummaryYesterday = async (identifier: string, useSlug: boolean = false) => {
    try {
      // Auto-detect if identifier looks like a slug (contains hyphens, lowercase)
      const looksLikeSlug = identifier.includes('-') && identifier === identifier.toLowerCase();
      const shouldUseSlug = useSlug || looksLikeSlug;
      const param = shouldUseSlug ? `slug=${identifier}` : `fullName=${encodeURIComponent(identifier)}`;
      const r = await fetch(`/api/summary/me?${param}&offsetDays=-1`);
      if (!r.ok) return;
      const data = await r.json();
      setMeYesterday({
        ...data,
        ...data.employee,
        employeeId: data.employee?.id,
      });
    } catch (e) {
      console.error('Error fetching my summary (yesterday):', e);
    }
  };

  const fetchLeaveBalance = async (slug: string) => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/leave/balance?slug=${slug}`);
      if (r.ok) {
        const data = await r.json();
        setLeaveBalance(data);
      } else {
        setLeaveBalance(null);
      }
    } catch (e) {
      console.error('Error fetching leave balance:', e);
      setLeaveBalance(null);
    }
  };

  const fetchMonthlyStats = async (slug: string) => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/monthly/stats?slug=${slug}`);
      if (r.ok) {
        const data = await r.json();
        setMonthlyStats(data);
      } else {
        setMonthlyStats(null);
      }
    } catch (e) {
      console.error('Error fetching monthly stats:', e);
      setMonthlyStats(null);
    }
  };

  const fetchPunctualityStats = async (slug: string) => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/stats/punctuality?slug=${slug}`);
      if (r.ok) {
        const data = await r.json();
        setPunctualityStats(data);
      } else {
        setPunctualityStats(null);
      }
    } catch (e) {
      console.error('Error fetching deep score stats:', e);
      setPunctualityStats(null);
    }
  };

  const fetchTodaySummary = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const r = await fetch(`/api/today/summary?t=${timestamp}`);
      if (!r.ok) return;
      const data = await r.json();
      setTodaySummary(data);
    } catch (e) {
      console.error('Error fetching today summary:', e);
    }
  };

  const fetchYesterdaySummary = async () => {
    try {
      const timestamp = new Date().getTime();
      const r = await fetch(`/api/today/summary?offsetDays=-1&t=${timestamp}`);
      if (!r.ok) return;
      const data = await r.json();
      setYesterdaySummary(data);
    } catch (e) {
      console.error('Error fetching yesterday summary:', e);
    }
  };

  // Format elapsed time as HH:MM:SS (clamped to 0)
  const formatTime = (seconds: number) => {
    const safe = Math.max(0, seconds | 0);
    const hrs = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const act = async (checkMode: 'office' | 'remote') => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setMsg('');
    
    // First check if there's already an open session
    if (hasOpen && currentSession) {
      setMsg('You already have an open session. Please check out first.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Get slug from localStorage if selectedEmployee is null
      const storedSlug = localStorage.getItem('userSlug');

      // Use slug for checkin if available, otherwise use full name
      const checkinData = (selectedEmployee?.slug || storedSlug)
        ? { slug: selectedEmployee?.slug || storedSlug, mode: checkMode }
        : { fullName: name, mode: checkMode };
      
      const r = await fetch('/api/checkin', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(checkinData) 
      });
      const j = await r.json();
      
      if (r.ok) {
        // Store session in localStorage
        localStorage.setItem('currentSession', JSON.stringify(j));
        setCurrentSession(j);
        setHasOpen(true);
        
        if (j.message && j.message.includes('already exists')) {
          // Existing session
          const message = `You already have an open session from ${formatISTTimeShort(j.session.checkin_ts)}`;
          setMsg(message);
        } else {
          // New session
          const message = `Checked in at ${formatISTTimeShort(j.session.checkin_ts)}`;
          setMsg(message);
          
          // Trigger AI notification for check-in
          if (FEATURE_AI_ENABLED) {
            setTimeout(() => {
              generateSmartNotification(`User just checked in and is working in ${checkMode} mode`);
            }, 1000);
          }

          // Reward animation — intensity based on punctuality
          const checkinHour = new Date(j.session.checkin_ts).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
          const [h, m] = checkinHour.split(':').map(Number);
          const checkinMinutes = h * 60 + m;
          const isOnTime = checkinMinutes <= 10 * 60 + 45; // 10:45 AM IST threshold

          if (isOnTime) {
            fireCheckInConfetti();
            setTimeout(() => fireOnTimeEmojis(), 200);
            if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);
            setLateCheckIn(false);
          } else {
            fireLateCheckInPuff();
            if (navigator.vibrate) navigator.vibrate([40]);
            setLateCheckIn(true);
            setTimeout(() => setLateCheckIn(false), 1200);
          }
          setCheckInSuccess(true);
          setTimeout(() => setCheckInSuccess(false), 1200);

          // Push notification (Feature 2)
          fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: me?.id,
              title: 'Checked in',
              body: `You checked in at ${formatISTTimeShort(j.session.checkin_ts)}`,
              tag: 'checkin',
            }),
          }).catch(() => {});
        }

        fetchMySummary(j.employee.slug);
        fetchTodaySummary();
        // Refresh my summary immediately so last in/out badges update without full reload
        if (j?.employee?.slug) {
          fetchMySummary(j.employee.slug, true);
        }
      } else {
        if (j.error && j.error.includes('unique constraint')) {
          setMsg('You already have an open session. Please check out first.');
          // Refresh session status
          if (selectedEmployee) {
            checkSessionStatus(selectedEmployee.slug);
          }
        } else {
          setMsg(j.error || 'Error');
        }
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  // Core checkout function - reusable for both manual and auto checkout
  const performCheckout = async (mood?: string, moodComment?: string, skipMoodUI: boolean = false): Promise<boolean> => {
    if (!currentSession) return false;
    
    const slug = currentSession.employee.slug;
    
    try {
      const r = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          slug,
          mood,
          moodComment
        }) 
      });
      const j = await r.json();
      
      if (r.ok) {
        // Update all related state atomically
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setHasOpen(false);
        setElapsedTime(0);
        if (!skipMoodUI) {
          setShowMoodCheck(false);
        }
        setSelectedMood('');
        setMoodComment('');

        // Reward animation (Feature 4)
        fireCheckOutConfetti();
        if (navigator.vibrate) navigator.vibrate([80]);

        // Push notification (Feature 2)
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: me?.id,
            title: 'Checked out',
            body: 'See you tomorrow!',
            tag: 'checkout',
          }),
        }).catch(() => {});

        // Refresh summaries (non-blocking)
        fetchTodaySummary();
        if (slug) {
          fetchMySummary(slug, true).catch(err => console.error('Error fetching summary:', err));
        }
        
        return true;
      } else {
        setMsg(j.error || 'Error');
        // If checkout failed, recheck session status
        checkSessionStatus(slug);
        return false;
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
      console.error('Checkout error:', error);
      return false;
    }
  };

  const checkout = async () => {
    if (!currentSession) return;
    
    // Show mood check before checkout
    setShowMoodCheck(true);
  };

  const handleMoodSubmit = async () => {
    setIsSubmitting(true);
    setMsg('');
    
    const success = await performCheckout(selectedMood, moodComment, false);
    
    if (!success) {
      // Error already set by performCheckout
      console.error('Checkout failed');
    }
    
    setIsSubmitting(false);
  };

  const handleNameSubmit = () => {
    if (name.trim() && selectedEmployee) {
      // Only allow submission if a valid employee is selected
      localStorage.setItem('userName', selectedEmployee.full_name);
      setIsLoggedIn(true);
      setShowNameInput(false);
      fetchMySummary(selectedEmployee.slug, true);
      fetchMySummaryYesterday(selectedEmployee.slug, true);
    }
  };

  const handleEmployeeSelect = (employee: any) => {
    setName(employee.full_name);
    setSelectedEmployee(employee);
    setSuggestions([]);
    // Auto-submit when employee is selected
    setTimeout(() => {
      localStorage.setItem('userName', employee.full_name);
      localStorage.setItem('userSlug', employee.slug);
      setIsLoggedIn(true);
      setShowNameInput(false);
      fetchMySummary(employee.slug, true); // Use slug for API calls
      fetchMySummaryYesterday(employee.slug, true);
    }, 100);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSelectedEmployee(null); // Clear selection when user types
    searchEmployees(value);
  };

  const handlePinLoginSuccess = async (employee: any, pinChangeRequired?: boolean) => {
    
    // If PIN change is required, show modal instead of logging in
    if (pinChangeRequired) {
      setPendingEmployee(employee);
      setShowPinChange(true);
      return;
    }
    
    // Complete login
    completeLogin(employee);
  };

  const completeLogin = (employee: any) => {
    // Set employee data
    setSelectedEmployee(employee);
    setName(employee.full_name);

    // Set me immediately from login data so tabs work before API calls resolve
    setMe((prev: any) => prev || { id: employee.id, full_name: employee.full_name, slug: employee.slug, email: employee.email });

    // Store in localStorage
    localStorage.setItem('userName', employee.full_name);
    localStorage.setItem('userSlug', employee.slug);
    if (employee.id) localStorage.setItem('employeeId', employee.id);

    // Update state
    setIsLoggedIn(true);
    setShowNameInput(false);

    // Fetch user data (will overwrite me with richer data if available)
    fetchMySummary(employee.slug, true);
    fetchMySummaryYesterday(employee.slug, true);
    fetchLeaveBalance(employee.slug);
    fetchMonthlyStats(employee.slug);
    fetchPunctualityStats(employee.slug);

    // Check for existing session
    checkSessionStatus(employee.slug);
  };

  const handlePinChanged = () => {
    // PIN changed successfully, complete login
    if (pendingEmployee) {
      setShowPinChange(false);
      completeLogin(pendingEmployee);
      setPendingEmployee(null);
    }
  };

  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('userName');
    localStorage.removeItem('userSlug');
    setCurrentSession(null);
    setHasOpen(false);
    setElapsedTime(0);
    setName('');
    setSelectedEmployee(null);
    setIsLoggedIn(false);
    setShowNameInput(true);
    setMe(null);
    setMsg('');
  };

  useEffect(()=>{ if(typeof window!== 'undefined') localStorage.setItem('mode', mode); },[mode]);
  useEffect(()=>{ fetchTodaySummary(); fetchYesterdaySummary(); },[]);

  // Push notification registration (Feature 2)
  useEffect(() => {
    if (!isLoggedIn || !me?.id) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), employeeId: me.id }),
        });
      } catch (err) {
        console.warn('Push registration failed:', err);
      }
    };

    registerPush();
  }, [isLoggedIn, me?.id]);

  // WFH plan fetch (Feature 3)
  useEffect(() => {
    if (!isLoggedIn || !me?.id) return;
    const weekStart = getMondayOfWeek(new Date());
    fetch(`/api/wfh-schedule?week=${weekStart}&employeeId=${me.id}`)
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
  }, [isLoggedIn, me?.id]);

  // Check-in and Check-out Reminder Notifications
  useEffect(() => {
    if (!remindersEnabled) return;

    const checkReminderTimes = () => {
      const now = new Date();
      const istTime = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
      
      const [currentHour, currentMinute] = istTime.split(':').map(Number);
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
      
      // Check-in reminder at 10:00 AM
      if (currentHour === 10 && currentMinute === 0) {
        const lastCheckinReminderDate = localStorage.getItem('lastCheckinReminderDate');
        
        if (lastCheckinReminderDate !== today && !hasOpen) {
          // Request notification permission
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Time to Check In!', {
              body: "Don't forget to check in for the day!",
              icon: '/insyde-logo.png',
              tag: 'checkin-reminder'
            });
          } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Time to Check In!', {
                  body: "Don't forget to check in for the day!",
                  icon: '/insyde-logo.png',
                  tag: 'checkin-reminder'
                });
              }
            });
          }
          
          localStorage.setItem('lastCheckinReminderDate', today);
        }
      }
      
      // Check-out reminder at 6:30 PM (18:30)
      if (currentHour === 18 && currentMinute === 30) {
        if (!hasOpen || !currentSession) return;
        
        const lastCheckoutReminderDate = localStorage.getItem('lastCheckoutReminderDate');
        
        if (lastCheckoutReminderDate !== today) {
          const checkinTime = formatISTTimeShort(currentSession.session.checkin_ts);
          
          // Request notification permission
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Time to Check Out!', {
              body: `You've been working since ${checkinTime}. Don't forget to check out!`,
              icon: '/insyde-logo.png',
              tag: 'checkout-reminder'
            });
          } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Time to Check Out!', {
                  body: `You've been working since ${checkinTime}. Don't forget to check out!`,
                  icon: '/insyde-logo.png',
                  tag: 'checkout-reminder'
                });
              }
            });
          }
          
          localStorage.setItem('lastCheckoutReminderDate', today);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkReminderTimes, 60000);
    checkReminderTimes(); // Check immediately

    return () => clearInterval(interval);
  }, [remindersEnabled, hasOpen, currentSession]);

  // Auto-Checkout After 12 Hours
  useEffect(() => {
    if (!hasOpen || !currentSession?.session?.checkin_ts) {
      setAutoCheckoutWarning(false);
      return;
    }

    const checkAutoCheckout = async () => {
      try {
        // Get check-in time and current time in UTC to avoid timezone issues
        const checkinTime = new Date(currentSession.session.checkin_ts).getTime();
        const now = Date.now();
        const hoursElapsed = (now - checkinTime) / (1000 * 60 * 60);
        
        // Get auto-checkout hours from localStorage (default: 12)
        const autoCheckoutHours = Number(localStorage.getItem('autoCheckoutHours')) || 12;
        const warningThreshold = autoCheckoutHours - (10 / 60); // 10 minutes before

        if (hoursElapsed >= autoCheckoutHours) {
          // Auto-checkout - perform checkout directly without mood UI
          const success = await performCheckout(undefined, `Auto-checked out after ${hoursElapsed.toFixed(2)} hours`, true);
          if (success) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Auto-Checkout', {
                body: `You've been automatically checked out after ${autoCheckoutHours} hours.`,
                icon: '/insyde-logo.png',
                tag: 'auto-checkout'
              });
            }
          }
        } else if (hoursElapsed >= warningThreshold) {
          // Show warning 10 minutes before (only set once)
          if (!autoCheckoutWarning) {
            setAutoCheckoutWarning(true);
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Auto-Checkout Warning', {
                body: `You'll be automatically checked out in 10 minutes.`,
                icon: '/insyde-logo.png',
                tag: 'auto-checkout-warning'
              });
            }
          }
        }
      } catch (error) {
        console.error('Auto-checkout check error:', error);
      }
    };

    // Check immediately on mount and when session changes
    checkAutoCheckout();
    
    // Check every 5 minutes for more reliable detection (was 15 minutes)
    // This ensures we catch the 12-hour threshold even if the page was idle
    const interval = setInterval(checkAutoCheckout, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [hasOpen, currentSession?.session?.checkin_ts]);

  // Format current date in IST
  const dateString = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  
  // Format date for Overview section (e.g., "Wed, Jul 22 2024")
  const overviewDateString = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  // Get user's first name for greeting
  const firstName = name ? name.split(' ')[0] : 'there';

  // Dynamic greeting based on time of day
  const greetingPrefix = (() => {
    const hour = new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' });
    const h = parseInt(hour);
    if (h < 6)  return { text: "Burning the midnight oil", emoji: "🌙" };
    if (h < 10) return { text: "Rise and shine", emoji: "☀️" };
    if (h < 12) return { text: "Good morning", emoji: "👋" };
    if (h < 14) return { text: "Hope lunch was good", emoji: "🍱" };
    if (h < 17) return { text: "Afternoon hustle", emoji: "⚡" };
    if (h < 20) return { text: "Evening check-in", emoji: "🌇" };
    return { text: "Working late tonight", emoji: "🦉" };
  })();
  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-8">
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="max-w-md mx-auto px-4 py-6 sm:px-6 w-full">
        {showNameInput ? (
          // PIN Login Screen
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm">
              <PinLogin onLoginSuccess={handlePinLoginSuccess} />
            </div>
          </div>
        ) : (
          // Main App - Mobile First Design
          <div className="space-y-6">
            {/* Header with Icons */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png" 
                  alt="insyde" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const newState = !remindersEnabled;
                    setRemindersEnabled(newState);
                    localStorage.setItem('remindersEnabled', String(newState));
                  }}
                  className="p-2 rounded-lg hover:bg-muted/80 transition-colors duration-200 focus:outline-none"
                  aria-label={remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
                  title={remindersEnabled ? 'Reminders ON (10AM & 6:30PM)' : 'Reminders OFF'}
                >
                  <Bell className={`w-4 h-4 transition-colors ${remindersEnabled ? 'text-foreground' : 'text-foreground/40'}`} />
                </button>
                <DarkModeToggle />
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-muted/80 transition-colors duration-200 focus:outline-none text-muted-foreground hover:text-foreground"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Greeting Section */}
            <div>
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                {greetingPrefix.text}, {firstName}! {greetingPrefix.emoji}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>

            {/* Top tabs removed — navigation moved to bottom nav bar */}

            {/* Tab Content */}
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'control' ? (
                  // User Control Tab
                  <motion.div
                    key="control"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                    className="space-y-6"
                  >
                  {/* Weekend Warning */}
                  {!isWorkDay(new Date()) && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-2"
                    >
                      <span>&#x26A0;&#xFE0F;</span>
                      <span>Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}. Checking in on a non-working day?</span>
                    </motion.div>
                  )}

                  {/* WFH Plan nudge — stays until week is filled */}
                  {!weeklyPlanFilled && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-primary/30 bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">Plan your week</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Let the team know your remote days.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('team')}
                        className="shrink-0 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        aria-label="Fill in plan"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* Action Card — Mode Toggle + Check-in Button */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="rounded-2xl bg-card border border-border/50 p-4 shadow-sm dark:shadow-none space-y-3">
                    {/* Office / Remote Pill Toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 w-fit">
                      <button
                        onClick={() => { setMode('office'); localStorage.setItem('mode', 'office'); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          mode === 'office'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <i className="fas fa-building text-xs" />
                        Office
                      </button>
                      <button
                        onClick={() => { setMode('remote'); localStorage.setItem('mode', 'remote'); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          mode === 'remote'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <i className="fas fa-home text-xs" />
                        Remote
                      </button>
                    </div>

                    {/* Check In / Check Out Button */}
                    <motion.button
                      animate={
                        checkInSuccess && !lateCheckIn
                          ? { scale: [1, 1.08, 1] }
                          : checkInSuccess && lateCheckIn
                            ? { x: [0, -4, 4, -3, 3, 0] }
                            : !isHolding && !hasOpen
                              ? { boxShadow: ['0 0 0 0 rgba(92, 250, 173, 0)', '0 0 0 8px rgba(92, 250, 173, 0.15)', '0 0 0 0 rgba(92, 250, 173, 0)'] }
                              : {}
                      }
                      transition={checkInSuccess ? { duration: 0.4 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className={`w-full h-14 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 select-none relative overflow-hidden ${
                        isHolding ? 'scale-[0.98]' : 'hover:scale-[1.01]'
                      } ${checkInSuccess && !lateCheckIn ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-background' : ''} ${checkInSuccess && lateCheckIn ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background' : ''}`}
                      style={{
                        background: holdProgress > 0
                          ? `linear-gradient(90deg, ${hasOpen ? '#dc2626' : '#90EE90'} ${holdProgress}%, ${hasOpen ? '#b91c1c' : '#7ED957'} ${holdProgress}%)`
                          : `linear-gradient(135deg, ${hasOpen ? '#dc2626' : '#90EE90'}, ${hasOpen ? '#b91c1c' : '#7ED957'})`,
                        boxShadow: holdProgress > 0
                          ? `0 0 15px rgba(${hasOpen ? '220, 38, 38' : '144, 238, 144'}, 0.4)`
                          : 'none'
                      }}
                      onMouseDown={handleHoldStart}
                      onMouseUp={handleHoldEnd}
                      onMouseLeave={handleHoldEnd}
                      onTouchStart={handleHoldStart}
                      onTouchEnd={handleHoldEnd}
                    >
                      <div className="text-white text-center select-none flex items-center space-x-3">
                        <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} text-xl`}></i>
                        <span className="font-semibold text-base">
                          {hasOpen
                            ? 'Check Out'
                            : `Check In at ${formatISTTimeShort(currentTime.toISOString())}`}
                        </span>
                      </div>
                    </motion.button>
                    {holdProgress > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Hold to confirm ({Math.round(holdProgress)}%)
                      </p>
                    )}
                  </motion.div>

                  {/* Mood Check-in Modal */}
                  {showMoodCheck && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border/50 shadow-lg">
                        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">How was your day?</h3>
                        
                        <div className="grid grid-cols-5 gap-3 mb-4">
                          {[
                            { emoji: '😊', value: 'great' },
                            { emoji: '🙂', value: 'good' },
                            { emoji: '😞', value: 'challenging' },
                            { emoji: '😴', value: 'exhausted' },
                            { emoji: '🚀', value: 'productive' }
                          ].map((mood) => (
                            <button
                              key={mood.value}
                              onClick={() => setSelectedMood(mood.value)}
                              className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                                selectedMood === mood.value
                                  ? 'border-primary bg-primary/10 scale-110'
                                  : 'border-border hover:border-primary/50 hover:scale-105'
                              }`}
                            >
                              <div className="text-2xl">{mood.emoji}</div>
                            </button>
                          ))}
                        </div>
                        
                        {selectedMood && (
                          <div className="mb-4">
                            <textarea
                              placeholder="Any highlights or challenges today? (optional)"
                              value={moodComment}
                              onChange={(e) => setMoodComment(e.target.value)}
                              className="w-full p-3 border border-input rounded-md text-sm resize-none bg-background"
                              rows={3}
                            />
                          </div>
                        )}
                        
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowMoodCheck(false);
                              setSelectedMood('');
                              setMoodComment('');
                            }}
                            className="flex-1 py-2 px-4 border border-input rounded-md text-foreground hover:bg-muted"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleMoodSubmit}
                            disabled={!selectedMood || isSubmitting}
                            className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors duration-200"
                          >
                            {isSubmitting ? 'Checking out...' : 'Check Out'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-Checkout Warning */}
                  {autoCheckoutWarning && (
                    <div className="text-left mb-4">
                      <div className="text-sm text-white bg-red-600 rounded-md p-3 relative">
                        <div className="font-medium mb-1 flex justify-between items-center">
                          <span>⚠️ Auto-Checkout Warning</span>
                          <button 
                            onClick={() => setAutoCheckoutWarning(false)}
                            className="text-white hover:text-gray-200 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div>You'll be automatically checked out in 10 minutes.</div>
                      </div>
                    </div>
                  )}

                  {/* System message */}
                  {msg && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-foreground bg-muted/60 border border-border/50 rounded-xl px-4 py-3"
                    >
                      {msg}
                    </motion.div>
                  )}

                  {/* Today's Presence Strip */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                    <PresenceStrip />
                  </motion.div>

                  {/* Stats Section — Raised card */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm dark:shadow-none space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overview</h3>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {overviewDateString}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => punctualityStats?.dayBreakdown && setBreakdownModal('deepScore')}
                        className={`text-left rounded-xl transition-opacity ${punctualityStats?.dayBreakdown ? 'cursor-pointer hover:opacity-80 active:opacity-70' : 'cursor-default'}`}
                      >
                        <OverviewCard
                          type="checkin"
                          time={punctualityStats?.punctualityScore !== undefined
                            ? punctualityStats.punctualityScore.toFixed(2)
                            : '--'}
                          secondaryText={punctualityStats?.maxScore ? `/${punctualityStats.maxScore}` : undefined}
                          status="na"
                          message="Deep Score"
                          tooltip="Your punctuality score this quarter. Higher = more on-time check-ins. Max is 42."
                        />
                      </button>

                      <button
                        onClick={() => punctualityStats?.windowDates && setBreakdownModal('noFill')}
                        className={`text-left rounded-xl transition-opacity ${punctualityStats?.windowDates ? 'cursor-pointer hover:opacity-80 active:opacity-70' : 'cursor-default'}`}
                      >
                        <OverviewCard
                          type="break"
                          time={punctualityStats?.noFillDays !== undefined
                            ? `${punctualityStats.noFillDays}`
                            : '--'}
                          status="na"
                          message="No-Fill Days"
                          tooltip="Working days this month where no check-in was recorded."
                        />
                      </button>

                      <OverviewCard
                        type="overtime"
                        time={punctualityStats?.avgCheckinTime || '--'}
                        status={punctualityStats?.checkinStatus || 'na'}
                        message="Avg Time"
                        tooltip="Your average check-in time this month."
                      />
                    </div>
                  </motion.div>

                  {/* Calendar Section */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                    <AttendanceHistory
                      userSlug={selectedEmployee?.slug || (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null) || undefined}
                      onDateSelect={() => {}}
                    />
                  </motion.div>
                  </motion.div>
                ) : activeTab === 'team' ? (
                  // Team Tab — Plan + Pulse merged
                  <motion.div
                    key="team"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                    className="space-y-6"
                  >
                    {/* 1. Your remote plan (interactive) */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                      <WFHPlannerTab
                        employeeId={plannerEmployeeId}
                        onScheduleSaved={(days) => {
                          setWeeklyPlanFilled(true);
                          setWeeklyPlanDays(days);
                        }}
                      />
                    </motion.div>

                    {/* 2. Who's in today — Raised card */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm dark:shadow-none space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today</h3>
                      <TodayPresenceCard />
                    </motion.div>

                    {/* 3. Personal streak — Raised card */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="bg-card rounded-2xl border border-border/50 px-4 py-3 shadow-sm dark:shadow-none flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Current streak</p>
                        <p className="text-xs text-muted-foreground">
                          {streak === 0 ? 'Build momentum with your next check-in.' : 'Consecutive days with a check-in.'}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl bg-muted/50 dark:bg-muted/30 px-3 py-2 text-center">
                        <p className="text-2xl font-semibold leading-none text-foreground">{streak}</p>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Days</p>
                      </div>
                    </motion.div>

                    {/* 4. Recent sessions — Raised card */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm dark:shadow-none space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Sessions</h3>
                      <RecentActivity
                        hideHeading
                        userSlug={selectedEmployee?.slug || (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null) || undefined}
                      />
                    </motion.div>
                  </motion.div>
                ) : activeTab === 'leave' ? (
                  // Leave Tab
                  <motion.div
                    key="leave"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LeaveManagement
                      employeeSlug={selectedEmployee?.slug || (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null) || undefined}
                      employeeEmail={(typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null) || undefined}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Bottom padding for fixed nav */}
            <div className="pb-20" />
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40">
          <div className="max-w-md mx-auto flex items-center justify-around px-6 py-2">
            {[
              { id: 'control' as const, icon: 'fa-house-chimney', label: 'Home' },
              { id: 'team' as const, icon: 'fa-users', label: 'Team' },
              { id: 'leave' as const, icon: 'fa-calendar-days', label: 'Leave' },
            ].map((tab) => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                <i className={`fas ${tab.icon} text-[17px]`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-gradient-brand"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* PIN Change Modal */}
      {showPinChange && pendingEmployee && (
        <PinChangeModal
          employeeId={pendingEmployee.id}
          employeeName={pendingEmployee.full_name}
          onPinChanged={handlePinChanged}
        />
      )}

      {/* Score Breakdown Modal */}
      <ScoreBreakdownModal
        open={breakdownModal !== null}
        onClose={() => setBreakdownModal(null)}
        type={breakdownModal ?? 'deepScore'}
        punctualityScore={punctualityStats?.punctualityScore}
        maxScore={punctualityStats?.maxScore}
        noFillDays={punctualityStats?.noFillDays}
        dayBreakdown={punctualityStats?.dayBreakdown}
        consistencyBonus={punctualityStats?.consistencyBonus}
        streakBonus={punctualityStats?.streakBonus}
        windowDates={punctualityStats?.windowDates}
      />
    </div>
  );
}
