'use client';

import { useEffect, useState } from 'react';
import { formatISTDateKey, formatISTTimeShort } from '@/lib/time';

const notify = (title: string, body: string, tag: string) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/insyde-logo.png', tag });
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/insyde-logo.png', tag });
      }
    });
  }
};

/**
 * Browser-notification reminders: check-in at 10:00 IST, check-out at 18:30
 * IST, each deduped per IST day via localStorage.
 */
export function useReminders(hasOpen: boolean, currentSession: any) {
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('remindersEnabled');
      return stored !== null ? stored === 'true' : true; // Default: enabled
    }
    return true;
  });

  const toggleReminders = () => {
    setRemindersEnabled(prev => {
      const next = !prev;
      localStorage.setItem('remindersEnabled', String(next));
      return next;
    });
  };

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
      const today = formatISTDateKey(now);

      // Check-in reminder at 10:00 AM
      if (currentHour === 10 && currentMinute === 0) {
        const lastCheckinReminderDate = localStorage.getItem('lastCheckinReminderDate');

        if (lastCheckinReminderDate !== today && !hasOpen) {
          notify('Time to Check In!', "Don't forget to check in for the day!", 'checkin-reminder');
          localStorage.setItem('lastCheckinReminderDate', today);
        }
      }

      // Check-out reminder at 6:30 PM (18:30)
      if (currentHour === 18 && currentMinute === 30) {
        if (!hasOpen || !currentSession) return;

        const lastCheckoutReminderDate = localStorage.getItem('lastCheckoutReminderDate');

        if (lastCheckoutReminderDate !== today) {
          const checkinTime = formatISTTimeShort(currentSession.session.checkin_ts);
          notify(
            'Time to Check Out!',
            `You've been working since ${checkinTime}. Don't forget to check out!`,
            'checkout-reminder'
          );
          localStorage.setItem('lastCheckoutReminderDate', today);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkReminderTimes, 60000);
    checkReminderTimes(); // Check immediately

    return () => clearInterval(interval);
  }, [remindersEnabled, hasOpen, currentSession]);

  return { remindersEnabled, toggleReminders };
}
