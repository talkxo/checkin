'use client';

import { useEffect, useRef, useState } from 'react';
import { formatISTTimeShort } from '@/lib/time';
import { fireCheckInConfetti, fireCheckOutConfetti, fireOnTimeEmojis, fireLateCheckInPuff } from '@/lib/use-reward';

interface UseAttendanceSessionOptions {
  /** Ref-style getters so callbacks always see the latest identity state. */
  getName: () => string;
  getSelectedEmployee: () => any;
  /** Called when an API call returns 401 — the page logs the user out. */
  onUnauthorized: () => void;
  refreshDashboard: () => void | Promise<void>;
}

/**
 * Owns the open/closed attendance session: check-in, mood-gated checkout,
 * auto-checkout, mode (office/remote) detection + persistence, and the
 * transient status messages shown on the home screen.
 */
export function useAttendanceSession({
  getName,
  getSelectedEmployee,
  onUnauthorized,
  refreshDashboard,
}: UseAttendanceSessionOptions) {
  const [hasOpen, setHasOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'office' | 'remote'>('office');
  const [msg, setMsg] = useState('');
  const [msgIsError, setMsgIsError] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [lateCheckIn, setLateCheckIn] = useState(false);
  const [autoCheckoutWarning, setAutoCheckoutWarning] = useState(false);
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [moodComment, setMoodComment] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Keep the latest option callbacks without re-subscribing effects.
  const optionsRef = useRef({ getName, getSelectedEmployee, onUnauthorized, refreshDashboard });
  optionsRef.current = { getName, getSelectedEmployee, onUnauthorized, refreshDashboard };

  const autoCheckoutWarningSentRef = useRef(false);

  const checkSessionStatus = async (): Promise<'open' | 'closed' | 'unauthorized' | 'error'> => {
    try {
      const r = await fetch('/api/session/open');

      if (r.status === 401) {
        return 'unauthorized';
      }

      const data = await r.json();

      if (data.ok && data.session) {
        setCurrentSession(data);
        setHasOpen(true);
        return 'open';
      } else {
        setHasOpen(false);
        setCurrentSession(null);
        localStorage.removeItem('currentSession');
        return 'closed';
      }
    } catch (e) {
      console.error('Error checking session status:', e);
      // On network error, preserve existing state — don't destroy a valid local session
      return 'error';
    }
  };

  const act = async (checkMode: 'office' | 'remote') => {
    if (!optionsRef.current.getName().trim() || isSubmitting) return;
    setIsSubmitting(true);
    setMsg('');
    setMsgIsError(false);

    // First check if there's already an open session
    if (hasOpen && currentSession) {
      setMsg('You already have an open session. Please check out first.');
      setIsSubmitting(false);
      return;
    }

    try {
      const r = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: checkMode })
      });
      const j = await r.json();

      if (r.ok) {
        // Store session in localStorage
        localStorage.setItem('currentSession', JSON.stringify(j));
        setCurrentSession(j);
        setHasOpen(true);

        if (j.message && j.message.includes('already exists')) {
          // Existing session
          setMsg(`You already have an open session from ${formatISTTimeShort(j.session.checkin_ts)}`);
        } else {
          // New session
          setMsg(`Checked in at ${formatISTTimeShort(j.session.checkin_ts)}`);

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
        }

        optionsRef.current.refreshDashboard();
      } else {
        if (r.status === 401) {
          optionsRef.current.onUnauthorized();
          setMsg('Your session has expired. Please log in again.');
          setIsSubmitting(false);
          return;
        }
        if (r.status === 404) {
          setMsgIsError(true);
          setMsg('Account not found or inactive. Please contact your admin.');
        } else if (j.error && j.error.includes('unique constraint')) {
          setMsg('You already have an open session. Please check out first.');
          const emp = optionsRef.current.getSelectedEmployee();
          if (emp) {
            checkSessionStatus();
          }
        } else {
          setMsgIsError(true);
          setMsg(j.error || 'Something went wrong. Please try again.');
        }
      }
    } catch (error) {
      setMsgIsError(true);
      setMsg('Connection issue. Please check your network and try again.');
    }

    setIsSubmitting(false);
  };

  // Core checkout function - reusable for both manual and auto checkout
  const performCheckout = async (mood?: string, moodComment?: string, skipMoodUI: boolean = false, checkoutTs?: string): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, moodComment, checkoutTs })
      });
      const j = await r.json();

      if (r.ok) {
        // Update all related state atomically
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setHasOpen(false);
        if (!skipMoodUI) {
          setShowMoodCheck(false);
        }
        setSelectedMood('');
        setMoodComment('');

        // Reward animation
        fireCheckOutConfetti();
        if (navigator.vibrate) navigator.vibrate([80]);

        // Refresh summaries (non-blocking)
        optionsRef.current.refreshDashboard();

        return true;
      } else {
        if (r.status === 401) {
          optionsRef.current.onUnauthorized();
          setMsg('Your session has expired. Please log in again.');
          return false;
        }
        if (r.status === 404) {
          setMsgIsError(true);
          setMsg(j.error || 'No open session found. You may have already checked out.');
        } else {
          setMsgIsError(true);
          setMsg(j.error || 'Something went wrong. Please try again.');
        }
        checkSessionStatus();
        return false;
      }
    } catch (error) {
      setMsgIsError(true);
      setMsg('Connection issue. Your session is saved — please refresh and try again.');
      console.error('Checkout error:', error);
      return false;
    }
  };

  const checkout = async () => {
    if (!currentSession) return;

    // Show mood check before checkout
    setShowMoodCheck(true);
  };

  const handleMoodSubmit = async (moodOverride?: string, commentOverride?: string) => {
    setIsSubmitting(true);
    setMsg('');
    setMsgIsError(false);

    const success = await performCheckout(
      moodOverride ?? selectedMood,
      commentOverride ?? moodComment,
      false
    );

    if (!success) {
      // Error already set by performCheckout
      console.error('Checkout failed');
    }

    setIsSubmitting(false);
  };

  const dismissMood = () => {
    setShowMoodCheck(false);
    setSelectedMood('');
    setMoodComment('');
  };

  // Get current location and determine mode
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;

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

        setMode(distance <= radius ? 'office' : 'remote');
      },
      (error) => {
        console.error('Error getting location:', error);
        setMode('remote'); // Default to remote if location fails
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const reset = () => {
    setCurrentSession(null);
    setHasOpen(false);
    setMsg('');
    setMsgIsError(false);
    setShowMoodCheck(false);
    setSelectedMood('');
    setMoodComment('');
    setAutoCheckoutWarning(false);
    autoCheckoutWarningSentRef.current = false;
  };

  const setMessage = (message: string, isError = false) => {
    setMsg(message);
    setMsgIsError(isError);
  };

  // Seed session state from a locally-persisted session during bootstrap.
  const seedSession = (sessionData: any) => {
    setCurrentSession(sessionData);
    setHasOpen(true);
  };

  // Persist mode across visits
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mode', mode);
  }, [mode]);

  // Live elapsed time for the open session — drives the check-in pod
  useEffect(() => {
    if (!hasOpen || !currentSession?.session?.checkin_ts) {
      setElapsedSeconds(0);
      return;
    }
    const checkin = new Date(currentSession.session.checkin_ts).getTime();
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - checkin) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hasOpen, currentSession?.session?.checkin_ts]);

  // Auto-checkout after N hours (default 12) with a warning 10 minutes prior
  useEffect(() => {
    if (!hasOpen || !currentSession?.session?.checkin_ts) {
      setAutoCheckoutWarning(false);
      autoCheckoutWarningSentRef.current = false;
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
          // Auto-checkout — cap the checkout timestamp at checkin + autoCheckoutHours
          const cappedTs = new Date(checkinTime + autoCheckoutHours * 60 * 60 * 1000).toISOString();
          const success = await performCheckout(undefined, `Auto-checked out after ${autoCheckoutHours} hours (capped)`, true, cappedTs);
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
          // Show warning 10 minutes before (only once per open session)
          if (!autoCheckoutWarningSentRef.current) {
            autoCheckoutWarningSentRef.current = true;
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

    // Check immediately on mount and when session changes, then every 5 minutes
    checkAutoCheckout();
    const interval = setInterval(checkAutoCheckout, 5 * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOpen, currentSession?.session?.checkin_ts]);

  return {
    // state
    hasOpen,
    currentSession,
    isSubmitting,
    mode,
    msg,
    msgIsError,
    checkInSuccess,
    lateCheckIn,
    autoCheckoutWarning,
    showMoodCheck,
    selectedMood,
    moodComment,
    elapsedSeconds,
    // actions
    act,
    checkout,
    performCheckout,
    handleMoodSubmit,
    dismissMood,
    checkSessionStatus,
    getCurrentLocation,
    setMode,
    setAutoCheckoutWarning,
    setMessage,
    seedSession,
    reset,
  };
}
