"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import AssistantChat from '@/components/assistant-chat';
import PinLogin from '@/components/pin-login';
import PinChangeModal from '@/components/pin-change-modal';
import StatusBadge from '@/components/status-badge';
import OverviewCard from '@/components/overview-card';
import RecentActivity from '@/components/recent-activity';
import AttendanceHistory from '@/components/attendance-history';
import DarkModeToggle from '@/components/dark-mode-toggle';

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
  } | null>(null);
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
  const [activeTab, setActiveTab] = useState<'control' | 'snapshot' | 'assistant'>('control');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [aiNotification, setAiNotification] = useState<string>('');
  const [greetingMessage, setGreetingMessage] = useState<string>('Time to do what you do best');
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [moodComment, setMoodComment] = useState<string>('');
  const [autoCheckoutWarning, setAutoCheckoutWarning] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);
  
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
    if (holdProgress === 0) {
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
      console.log('Generating AI notification for context:', context.substring(0, 100) + '...');
      
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
        console.log('AI notification received:', data.notification?.substring(0, 100) + '...');
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
          console.log('Setting name from session:', savedName);
          setName(savedName);
          setIsLoggedIn(true);
          setShowNameInput(false);
          
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
        console.log('=== SESSION RESTORE DEBUG ===');
        console.log('Restored savedName from localStorage:', savedName);
        
        // Try to get the slug from localStorage
        const savedSlug = typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null;
        console.log('Restored savedSlug from localStorage:', savedSlug);
        
        setName(savedName);
        setIsLoggedIn(true);
        setShowNameInput(false);
        
        // Ensure UI leaves loading state immediately
        setIsLoading(false);
        
        // If we have a slug, try to reconstruct the selectedEmployee object and check session
        if (savedSlug) {
          setSelectedEmployee({
            full_name: savedName,
            slug: savedSlug
          });
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
    if (holdProgress === 0) {
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
      console.log('=== SESSION STATUS DEBUG ===');
      console.log('Checking session status for slug:', slug);
      
      const r = await fetch(`/api/session/open?slug=${slug}`);
      const data = await r.json();
      
      console.log('Session status response:', data);
      
      if (data.ok && data.session) {
        setCurrentSession(data);
        setHasOpen(true);
        console.log('Found open session:', data.session);
      } else {
        setHasOpen(false);
        setCurrentSession(null);
        console.log('No open session found');
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
      console.log('=== FETCH SUMMARY DEBUG ===');
      console.log('Identifier:', identifier);
      console.log('Use slug:', useSlug);
      
      // Auto-detect if identifier looks like a slug (contains hyphens, lowercase)
      const looksLikeSlug = identifier.includes('-') && identifier === identifier.toLowerCase();
      const shouldUseSlug = useSlug || looksLikeSlug;
      
      console.log('Identifier looks like slug:', looksLikeSlug);
      console.log('Should use slug:', shouldUseSlug);
      
      const param = shouldUseSlug ? `slug=${identifier}` : `fullName=${encodeURIComponent(identifier)}`;
      console.log('API URL param:', param);
      
      const r = await fetch(`/api/summary/me?${param}`);
      console.log('Response status:', r.status);
      
      if (!r.ok) {
        console.log('Response not ok, status:', r.status);
        return;
      }
      
      const data = await r.json();
      console.log('Summary data:', data);
      setMe(data);
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
      setMeYesterday(data);
    } catch (e) {
      console.error('Error fetching my summary (yesterday):', e);
    }
  };

  const fetchLeaveBalance = async (slug: string) => {
    if (!slug) {
      console.warn('fetchLeaveBalance: No slug provided');
      return;
    }
    try {
      console.log('Fetching leave balance for slug:', slug);
      const r = await fetch(`/api/leave/balance?slug=${slug}`);
      if (r.ok) {
        const data = await r.json();
        console.log('Leave balance data:', data);
        setLeaveBalance(data);
      } else {
        const errorData = await r.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('Leave balance API error:', r.status, errorData);
        // Set to null so UI shows "--" instead of "Loading..."
        setLeaveBalance(null);
      }
    } catch (e) {
      console.error('Error fetching leave balance:', e);
      setLeaveBalance(null);
    }
  };

  const fetchMonthlyStats = async (slug: string) => {
    if (!slug) {
      console.warn('fetchMonthlyStats: No slug provided');
      return;
    }
    try {
      const r = await fetch(`/api/monthly/stats?slug=${slug}`);
      if (r.ok) {
        const data = await r.json();
        setMonthlyStats(data);
      } else {
        console.warn('Monthly stats API error:', r.status);
        setMonthlyStats(null);
      }
    } catch (e) {
      console.error('Error fetching monthly stats:', e);
      setMonthlyStats(null);
    }
  };

  const fetchPunctualityStats = async (slug: string) => {
    if (!slug) {
      console.warn('fetchPunctualityStats: No slug provided');
      return;
    }
    try {
      const r = await fetch(`/api/stats/punctuality?slug=${slug}`);
      if (r.ok) {
        const data = await r.json();
        setPunctualityStats(data);
      } else {
        console.warn('Deep score stats API error:', r.status);
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
      console.log('=== CHECKIN DEBUG ===');
      console.log('Sending checkin request with:', { fullName: name, mode: checkMode });
      console.log('Name variable value:', name);
      console.log('Selected employee:', selectedEmployee);
      
      // Get slug from localStorage if selectedEmployee is null
      const storedSlug = localStorage.getItem('userSlug');
      console.log('Stored slug from localStorage:', storedSlug);
      
      // Use slug for checkin if available, otherwise use full name
      const checkinData = (selectedEmployee?.slug || storedSlug)
        ? { slug: selectedEmployee?.slug || storedSlug, mode: checkMode }
        : { fullName: name, mode: checkMode };
      
      console.log('Final checkin data:', checkinData);
      
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
          setTimeout(() => {
            generateSmartNotification(`User just checked in and is working in ${checkMode} mode`);
          }, 1000);
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

  const checkout = async () => {
    if (!currentSession) return;
    
    // Show mood check before checkout
    setShowMoodCheck(true);
  };

  const handleMoodSubmit = async () => {
    setIsSubmitting(true);
    setMsg('');
    
    try {
      const r = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          slug: currentSession.employee.slug,
          mood: selectedMood,
          moodComment: moodComment
        }) 
      });
      const j = await r.json();
      
      if (r.ok) {
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setHasOpen(false);
        setElapsedTime(0);
        setShowMoodCheck(false);
        setSelectedMood('');
        setMoodComment('');
        
        // AI notification already initiated during hold
        
        fetchTodaySummary();
        // Also refresh summary for last in/out immediately after checkout
        if (currentSession?.employee?.slug) {
          fetchMySummary(currentSession.employee.slug, true);
        }
      } else {
        setMsg(j.error || 'Error');
        // If checkout failed, recheck session status
        checkSessionStatus(currentSession.employee.slug);
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
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
    console.log('=== EMPLOYEE SELECT DEBUG ===');
    console.log('Selected employee:', employee);
    console.log('Full name:', employee.full_name);
    console.log('Slug:', employee.slug);
    
    setName(employee.full_name);
    setSelectedEmployee(employee);
    setSuggestions([]);
    // Auto-submit when employee is selected
    setTimeout(() => {
      localStorage.setItem('userName', employee.full_name);
      localStorage.setItem('userSlug', employee.slug); // Store slug separately
      console.log('Stored in localStorage:', employee.full_name);
      console.log('Stored slug in localStorage:', employee.slug);
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
    console.log('=== PIN LOGIN SUCCESS ===');
    console.log('Employee data:', employee);
    console.log('PIN change required:', pinChangeRequired);
    
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
    
    // Store in localStorage
    localStorage.setItem('userName', employee.full_name);
    localStorage.setItem('userSlug', employee.slug);
    
    // Update state
    setIsLoggedIn(true);
    setShowNameInput(false);
    
    // Fetch user data
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

    const checkAutoCheckout = () => {
      const checkinTime = new Date(currentSession.session.checkin_ts).getTime();
      const now = Date.now();
      const hoursElapsed = (now - checkinTime) / (1000 * 60 * 60);
      
      // Get auto-checkout hours from localStorage (default: 12)
      const autoCheckoutHours = Number(localStorage.getItem('autoCheckoutHours')) || 12;
      const warningThreshold = autoCheckoutHours - (10 / 60); // 10 minutes before

      if (hoursElapsed >= autoCheckoutHours) {
        // Auto-checkout
        checkout();
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Auto-Checkout', {
            body: `You've been automatically checked out after ${autoCheckoutHours} hours.`,
            icon: '/insyde-logo.png',
            tag: 'auto-checkout'
          });
        }
      } else if (hoursElapsed >= warningThreshold && !autoCheckoutWarning) {
        // Show warning 10 minutes before
        setAutoCheckoutWarning(true);
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Auto-Checkout Warning', {
            body: `You'll be automatically checked out in 10 minutes.`,
            icon: '/insyde-logo.png',
            tag: 'auto-checkout-warning'
          });
        }
      }
    };

    // Check every 15 minutes
    const interval = setInterval(checkAutoCheckout, 15 * 60 * 1000);
    checkAutoCheckout(); // Check immediately

    return () => clearInterval(interval);
  }, [hasOpen, currentSession, autoCheckoutWarning]);

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
  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-8">
        <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground dark:text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="max-w-md mx-auto px-4 py-6 sm:px-6">
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newState = !remindersEnabled;
                    setRemindersEnabled(newState);
                    localStorage.setItem('remindersEnabled', String(newState));
                  }}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label={remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
                  title={remindersEnabled ? 'Reminders ON (10AM & 6:30PM)' : 'Reminders OFF'}
                >
                  <Bell className={`w-5 h-5 transition-colors ${remindersEnabled ? 'text-foreground' : 'text-foreground/40'}`} />
                </button>
              </div>
            </div>

            {/* Greeting Section */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                What's up, {firstName}!
              </h1>
            </div>

            {/* Tab Navigation - Mobile Style */}
            <div className="flex gap-1 border-b border-border/50 dark:border-border mb-6 overflow-x-auto">
              <button
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
                  activeTab === 'control'
                    ? 'border-primary text-foreground dark:text-foreground'
                    : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('control')}
              >
                My Control
              </button>
              <button
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
                  activeTab === 'snapshot'
                    ? 'border-primary text-foreground dark:text-foreground'
                    : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('snapshot')}
              >
                Snapshot
              </button>
              <button
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
                  activeTab === 'assistant'
                    ? 'border-primary text-foreground dark:text-foreground'
                    : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('assistant')}
              >
                Assistant
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'control' ? (
                  // User Control Tab
                  <motion.div
                    key="control"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                  {/* Location Button and Check In Button */}
                  <div>
                    <div className="space-y-4">
                      {/* Location Button and Check In Button Side by Side */}
                      <div className="w-full flex gap-3 items-center">
                        {/* Square Location Button */}
                        <button
                          className="h-16 w-16 rounded-lg border border-border/50 dark:border-border bg-background dark:bg-background flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-muted dark:hover:bg-muted flex-shrink-0 elevation-sm button-press"
                          disabled={isLocationLoading}
                        >
                          {isLocationLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                          ) : (
                            <i className={`fas ${mode === 'office' ? 'fa-building' : 'fa-home'} text-lg text-muted-foreground dark:text-muted-foreground`}></i>
                          )}
                        </button>
                        
                        {/* Full-width Hold Button */}
                        <button
                          className={`flex-1 h-16 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 select-none relative overflow-hidden button-press elevation-lg ${
                            isHolding ? 'scale-[0.98]' : 'hover:scale-[1.01]'
                          }`}
                          style={{
                            background: holdProgress > 0 
                              ? `linear-gradient(90deg, ${hasOpen ? '#dc2626' : '#90EE90'} ${holdProgress}%, ${hasOpen ? '#b91c1c' : '#7ED957'} ${holdProgress}%)`
                              : `linear-gradient(135deg, ${hasOpen ? '#dc2626' : '#90EE90'}, ${hasOpen ? '#b91c1c' : '#7ED957'})`,
                            boxShadow: holdProgress > 0 
                              ? `0 0 20px rgba(${hasOpen ? '220, 38, 38' : '144, 238, 144'}, 0.5)` 
                              : hasOpen 
                                ? '0 10px 25px rgba(220, 38, 38, 0.3)' 
                                : '0 10px 25px rgba(144, 238, 144, 0.3)'
                          }}
                          onMouseDown={handleHoldStart}
                          onMouseUp={handleHoldEnd}
                          onMouseLeave={handleHoldEnd}
                          onTouchStart={handleHoldStart}
                          onTouchEnd={handleHoldEnd}
                        >
                          <div className="text-white text-center select-none flex items-center space-x-3">
                            <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} text-2xl`}></i>
                            <span className="font-semibold text-lg">
                              {hasOpen 
                                ? 'Check Out' 
                                : `Check In at ${currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          </div>
                        </button>
                      </div>
                      {holdProgress > 0 && (
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground text-center mt-2">
                          Hold to confirm ({Math.round(holdProgress)}%)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mood Check-in Modal */}
                  {showMoodCheck && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">How was your day?</h3>
                        
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

                  {/* AI Output Display */}
                  {(aiNotification || msg) && (
                    <div className="text-left">
                      <div className="text-sm bg-card dark:bg-card border border-border/50 dark:border-border rounded-xl p-4 min-h-[60px] relative elevation-md">
                        {aiNotification ? (
                          <div>
                            <div className="font-medium mb-1 text-foreground dark:text-foreground flex justify-between items-center">
                              <span>✨</span>
                              <button 
                                onClick={() => setAiNotification('')}
                                className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground text-xs transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="text-foreground dark:text-foreground">{aiNotification}</div>
                          </div>
                        ) : (
                          <div className="text-foreground dark:text-foreground">{msg}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Divider below action area - Minimal */}
                  <div className="my-8 h-px bg-border" />

                  {/* Overview Section */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
                      <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Overview</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{overviewDateString}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Deep Score Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <OverviewCard
                          type="checkin"
                          time={punctualityStats?.punctualityScore !== undefined 
                            ? punctualityStats.punctualityScore.toFixed(2)
                            : '--'}
                          secondaryText={punctualityStats?.maxScore ? `/${punctualityStats.maxScore}` : undefined}
                          status="na"
                          message="Deep Score"
                        />
                      </motion.div>

                      {/* No-Fill Days Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <OverviewCard
                          type="break"
                          time={punctualityStats?.noFillDays !== undefined 
                            ? `${punctualityStats.noFillDays}`
                            : '--'}
                          status="na"
                          message="No-Fill Days"
                        />
                      </motion.div>

                      {/* Average Time Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <OverviewCard
                          type="overtime"
                          time={punctualityStats?.avgCheckinTime || '--'}
                          status={punctualityStats?.checkinStatus || 'na'}
                          message="Average Time"
                        />
                      </motion.div>
                    </div>

                    {/* Attendance History Section - Monthly Calendar View */}
                    <div className="mt-6">
                      <AttendanceHistory
                        userSlug={selectedEmployee?.slug || (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null) || undefined}
                        onDateSelect={(date) => {
                          // Optional: handle date selection
                          console.log('Date selected:', date);
                        }}
                      />
                    </div>
                  </div>
                  </motion.div>
                ) : activeTab === 'assistant' ? (
                  // Assistant Tab
                  <motion.div
                    key="assistant"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AssistantChat 
                      isVisible={true} 
                      userSlug={selectedEmployee?.slug}
                    />
                  </motion.div>
                ) : (
                  // Snapshot Tab
                  <motion.div
                    key="snapshot"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                  {/* Recent Activity Section */}
                  <div>
                    <RecentActivity userSlug={selectedEmployee?.slug || (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null) || undefined} />
                  </div>

                  {/* Today's Attendance - Notion Style Accordion */}
                  <div className="notion-card-hover p-0">
                    <button
                      onClick={() => setIsTodayAttendanceOpen(!isTodayAttendanceOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          isTodayAttendanceOpen ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isTodayAttendanceOpen && (
                      <div className="px-4 pb-4 border-t border-gray-200">
                        {todaySummary.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No check-ins yet.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto mt-4">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">In</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Out</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Hours</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todaySummary.map((emp: any) => (
                            <tr key={emp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-medium text-foreground text-sm">{emp.full_name}</td>
                              <td className="px-3 py-2">
                                {emp.lastIn ? (
                                  <span className="notion-badge notion-badge-success text-xs">
                                    {emp.lastIn}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {emp.lastOut ? (
                                  <span className="notion-badge notion-badge-outline text-xs">
                                    {emp.lastOut}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className="notion-badge notion-badge-info text-xs">
                                  {emp.workedHours}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {emp.open ? (
                                  <span className="notion-badge notion-badge-danger text-xs">
                                    Active
                                  </span>
                                ) : emp.lastIn ? (
                                  <span className="notion-badge notion-badge-success text-xs">
                                    Complete
                                  </span>
                                ) : (
                                  <span className="notion-badge notion-badge-outline text-xs">
                                    Not Started
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Removed Yesterday's Attendance from Snapshot as requested */}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {isLoggedIn && (
              <div className="mt-8 pt-6 border-t border-border/50 dark:border-border flex items-center justify-between">
                <Link 
                  href="/leave"
                  className="text-sm text-muted-foreground dark:text-muted-foreground hover:text-foreground transition-colors"
                >
                  Manage Leaves
                </Link>
                <div className="flex items-center gap-3">
                  <DarkModeToggle />
                  <Button 
                    variant="ghost"
                    onClick={handleLogout}
                    className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PIN Change Modal */}
      {showPinChange && pendingEmployee && (
        <PinChangeModal
          employeeId={pendingEmployee.id}
          employeeName={pendingEmployee.full_name}
          onPinChanged={handlePinChanged}
        />
      )}
    </div>
  );
}


