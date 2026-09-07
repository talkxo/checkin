"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const PinLogin = dynamic(() => import('@/components/pin-login'), { ssr: false });
const PinChangeModal = dynamic(() => import('@/components/pin-change-modal'), { ssr: false });
const RecentActivity = dynamic(() => import('@/components/recent-activity'), { ssr: false });
const AttendanceHistory = dynamic(() => import('@/components/attendance-history'), { ssr: false });
const WFHPlannerTab = dynamic(() => import('@/components/wfh-planner-tab'), { ssr: false });
const LeaveManagement = dynamic(() => import('@/components/leave-management'), { ssr: false });
const TodayPresenceCard = dynamic(() => import('@/components/today-presence-card'), { ssr: false });
const ScoreBreakdownModal = dynamic(() => import('@/components/score-breakdown-modal'), { ssr: false });

import MoodCheck from '@/components/home/mood-check';

import GreetingHeader from '@/components/home/greeting-header';
import CheckInCard from '@/components/home/check-in-card';
import StreakTile from '@/components/home/streak-tile';
import BottomNav, { type HomeTab } from '@/components/home/bottom-nav';
import { AvgInTile, DeepScoreTile, NoFillTile } from '@/components/home/overview-stats';
import { useClock } from '@/hooks/use-clock';
import { useHoldToConfirm } from '@/hooks/use-hold-to-confirm';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAttendanceSession } from '@/hooks/use-attendance-session';
import { useStreak } from '@/hooks/use-streak';
import { useWeeklyPlan } from '@/hooks/use-weekly-plan';
import { useReminders } from '@/hooks/use-reminders';
import { isWorkdayIST } from '@/lib/time';

const getClientUserSlug = () =>
  (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null) || undefined;

export default function HomePage() {
  // Identity — page-level because login/logout orchestration touches every hook
  const [name, setName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [pendingEmployee, setPendingEmployee] = useState<any>(null);
  const [showPinChange, setShowPinChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [breakdownModal, setBreakdownModal] = useState<'deepScore' | 'noFill' | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTab>('today');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const currentTime = useClock();

  const { punctualityStats, fetchDashboardInit } = useDashboardData(setMe);

  // Ref-style bridges so the session hook sees fresh identity state without
  // effect re-subscriptions.
  const nameRef = useRef(name);
  nameRef.current = name;
  const selectedEmployeeRef = useRef(selectedEmployee);
  selectedEmployeeRef.current = selectedEmployee;
  const logoutRef = useRef<() => void>(() => {});

  const session = useAttendanceSession({
    getName: () => nameRef.current,
    getSelectedEmployee: () => selectedEmployeeRef.current,
    onUnauthorized: () => logoutRef.current(),
    refreshDashboard: fetchDashboardInit,
  });

  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('userName');
    localStorage.removeItem('userSlug');
    localStorage.removeItem('displayName');
    session.reset();
    setName('');
    setSelectedEmployee(null);
    setIsLoggedIn(false);
    setShowLogin(true);
    setMe(null);
    setLeaveOpen(false);
  };
  logoutRef.current = handleLogout;

  const hold = useHoldToConfirm(() => {
    if (session.hasOpen) {
      session.checkout();
    } else {
      session.act(session.mode);
    }
  });

  const streak = useStreak(isLoggedIn, selectedEmployee?.slug || me?.slug);
  const { weeklyPlanFilled, weeklyPlanDays, markPlanSaved } = useWeeklyPlan(
    isLoggedIn ? me?.id : undefined
  );
  const { remindersEnabled, toggleReminders } = useReminders(
    session.hasOpen,
    session.currentSession
  );

  const plannerEmployeeId =
    me?.id ||
    me?.employee?.id ||
    session.currentSession?.session?.employee_id ||
    selectedEmployee?.id ||
    (typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null) ||
    undefined;

  // Bootstrap: restore persisted identity/session, validate with the server,
  // then load dashboard data — sequential, not racing.
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const saved = (localStorage.getItem('mode') as any) || 'office';
    session.setMode(saved);
    const savedDisplayName = localStorage.getItem('displayName');
    if (savedDisplayName) setDisplayName(savedDisplayName);

    const savedSession = localStorage.getItem('currentSession');
    const savedName = localStorage.getItem('userName');

    if (!savedName) {
      setIsLoading(false);
      session.getCurrentLocation();
      return;
    }

    // User was previously logged in — restore local state immediately
    setName(savedName);
    setIsLoggedIn(true);
    setShowLogin(false);

    let sessionData: any = null;
    if (savedSession) {
      try {
        sessionData = JSON.parse(savedSession);
        if (!sessionData?.employee?.slug) throw new Error('Invalid session data');
        session.seedSession(sessionData);
        setSelectedEmployee(sessionData.employee);
        setMe((prev: any) => prev || { id: sessionData.employee.id, full_name: sessionData.employee.full_name || savedName, slug: sessionData.employee.slug });
      } catch (e) {
        console.error('Error parsing session data:', e);
        localStorage.removeItem('currentSession');
        sessionData = null;
      }
    }

    const initSession = async () => {
      try {
        // Step 1: Validate the cookie is still good via session/open
        const status = await session.checkSessionStatus();

        if (status === 'unauthorized') {
          handleLogout();
          session.setMessage('Your session has expired. Please log in again.');
          return;
        }

        // Step 2: Load dashboard data (only if cookie is valid)
        await fetchDashboardInit();
      } catch (e) {
        console.error('Error in session init:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
    session.getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login flow
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
    setShowLogin(false);

    // Fetch consolidated dashboard data (will overwrite me with richer data)
    fetchDashboardInit();

    // Check for existing session
    session.checkSessionStatus();
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

  const handlePinChanged = () => {
    // PIN changed successfully, complete login
    if (pendingEmployee) {
      setShowPinChange(false);
      completeLogin(pendingEmployee);
      setPendingEmployee(null);
    }
  };

  // Register the service worker for PWA installability + offline app shell.
  // Not gated behind login — the login screen itself is part of the app
  // shell, and installability should be available to any visitor.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }, []);

  // Greeting name — preferred display name wins, else first name on record
  const firstName = displayName.trim() || (name ? name.trim().split(' ')[0] : 'there');

  // Dynamic greeting based on time of day (IST)
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

  const dateLine = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

  if (isLoading) {
    return (
      <div className="ambient-page flex min-h-screen items-center justify-center bg-background dark:bg-background">
        <div className="flex flex-col items-center">
          <motion.img
            src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
            alt=""
            className="h-16 w-16"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.92, 1, 0.92] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            INSYDE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ambient-page main-typography min-h-screen bg-background dark:bg-background">
      <div className="max-w-md mx-auto px-4 py-6 sm:px-6 w-full">
        {showLogin ? (
          // PIN Login Screen
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm">
              <PinLogin onLoginSuccess={handlePinLoginSuccess} />
            </div>
          </div>
        ) : (
          // Main App - Mobile First Design
          <div className="space-y-6">
            <GreetingHeader
              recordName={name}
              displayName={displayName}
              onDisplayNameChange={(n) => {
                setDisplayName(n);
                if (n.trim()) localStorage.setItem('displayName', n.trim());
                else localStorage.removeItem('displayName');
              }}
              greetingText={greetingPrefix.text}
              greetingEmoji={greetingPrefix.emoji}
              dateLine={dateLine}
              remindersEnabled={remindersEnabled}
              onToggleReminders={toggleReminders}
              onLogout={handleLogout}
            />

            {/* Tab Content */}
            <div className="min-h-[430px]">
              <AnimatePresence mode="wait">
                {activeTab === 'today' ? (
                  // Today Tab — check in, streak, personal stats
                  <motion.div
                    key="today"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                    className="space-y-4"
                  >
                    {/* Weekend Warning */}
                    {!isWorkdayIST() && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-2"
                      >
                        <span>&#x26A0;&#xFE0F;</span>
                        <span>Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}. Checking in on a non-working day?</span>
                      </motion.div>
                    )}

                    {/* Bento: check-in pod (morphs into the mood check on checkout) + streak/avg column */}
                    <div className="grid grid-cols-2 gap-3 items-stretch">
                      {session.showMoodCheck ? (
                        <MoodCheck
                          onSubmit={session.handleMoodSubmit}
                          onClose={session.dismissMood}
                          isSubmitting={session.isSubmitting}
                        />
                      ) : (
                        <CheckInCard
                          mode={session.mode}
                          onModeChange={session.setMode}
                          hasOpen={session.hasOpen}
                          checkinTs={session.currentSession?.session?.checkin_ts ?? null}
                          checkInSuccess={session.checkInSuccess}
                          lateCheckIn={session.lateCheckIn}
                          isHolding={hold.isHolding}
                          holdProgress={hold.holdProgress}
                          onHoldStart={hold.handleHoldStart}
                          onHoldEnd={hold.handleHoldEnd}
                          now={currentTime}
                          elapsedSeconds={session.elapsedSeconds}
                        />
                      )}
                      <div className="flex flex-col gap-3">
                        <StreakTile current={streak.current} best={streak.best} />
                        <AvgInTile stats={punctualityStats} />
                      </div>
                    </div>

                    {/* Auto-Checkout Warning */}
                    {session.autoCheckoutWarning && (
                      <div className="text-left">
                        <div className="text-sm text-white bg-red-600 rounded-md p-3 relative">
                          <div className="font-medium mb-1 flex justify-between items-center">
                            <span>⚠️ Auto-Checkout Warning</span>
                            <button
                              onClick={() => session.setAutoCheckoutWarning(false)}
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
                    {session.msg && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-sm rounded-xl px-4 py-3 ${
                          session.msgIsError
                            ? 'text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/30'
                            : 'text-foreground bg-muted/60 border border-border/50'
                        }`}
                      >
                        {session.msg}
                      </motion.div>
                    )}

                    {/* Deep Score + No-Fill */}
                    <div className="grid grid-cols-2 gap-3">
                      <DeepScoreTile
                        stats={punctualityStats}
                        onOpen={() => setBreakdownModal('deepScore')}
                      />
                      <NoFillTile
                        stats={punctualityStats}
                        onOpen={() => setBreakdownModal('noFill')}
                      />
                    </div>

                    {/* Who's in today */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="glass rounded-2xl p-4 space-y-2">
                      <h3 className="card-label">Who&apos;s in today</h3>
                      <TodayPresenceCard />
                    </motion.div>
                  </motion.div>
                ) : activeTab === 'team' ? (
                  // Team Tab — plans, announcements, collective activity
                  <motion.div
                    key="team"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                    className="space-y-4"
                  >
                    {/* WFH plan nudge — stays until week is filled */}
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
                          onClick={() => {
                            const el = document.getElementById('wfh-planner');
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="shrink-0 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          aria-label="Fill in plan"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}

                    {/* Your remote plan (interactive) */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} id="wfh-planner">
                      <WFHPlannerTab
                        employeeId={plannerEmployeeId}
                        onScheduleSaved={markPlanSaved}
                      />
                    </motion.div>

                    {/* Announcements & notifications */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="glass rounded-2xl p-4 space-y-2">
                      <h3 className="card-label">Announcements &amp; Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Nothing yet. Admin broadcasts and updates about your leave will land here.
                      </p>
                    </motion.div>

                    {/* Team activity — everyone's recent sessions */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="glass rounded-2xl p-4 space-y-2">
                      <h3 className="card-label">Team activity</h3>
                      <RecentActivity hideHeading />
                    </motion.div>
                  </motion.div>
                ) : (
                  // Calendar Tab — blended timeline: attendance, leave, holidays
                  <motion.div
                    key="calendar"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                    className="space-y-4"
                  >
                    {/* Blended attendance + leave + holiday heatmap */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                      <AttendanceHistory
                        userSlug={selectedEmployee?.slug || getClientUserSlug()}
                        onDateSelect={() => {}}
                      />
                    </motion.div>

                    {/* Leave — balances, requests, history */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="glass overflow-hidden rounded-2xl">
                      <button
                        onClick={() => setLeaveOpen((v) => !v)}
                        aria-expanded={leaveOpen}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">Leave</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Balances, requests &amp; history</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${leaveOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {leaveOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4">
                              <LeaveManagement
                                employeeSlug={selectedEmployee?.slug || getClientUserSlug()}
                                employeeEmail={(typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null) || undefined}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom padding for floating nav */}
            <div className="pb-28" />
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation */}
      {isLoggedIn && (
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
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
