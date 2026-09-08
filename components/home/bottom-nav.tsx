'use client';

import { motion } from 'framer-motion';

export type HomeTab = 'today' | 'team' | 'calendar';

interface BottomNavProps {
  activeTab: HomeTab;
  onChange: (tab: HomeTab) => void;
}

const TABS: Array<{ id: HomeTab; icon: string; label: string }> = [
  { id: 'today', icon: 'fa-clock', label: 'Today' },
  { id: 'team', icon: 'fa-users', label: 'Team' },
  { id: 'calendar', icon: 'fa-calendar-days', label: 'Calendar' },
];

/**
 * Floating glass nav — 64px (between iOS's 49pt tab bar and Material 3's
 * 80dp nav bar, sized for inline icon+label items). iOS-style tint selection
 * with a floating underline that slides to the active tab.
 */
export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="glass-strong pointer-events-auto fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto flex h-16 max-w-md items-center justify-around rounded-full sm:left-6 sm:right-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex h-full flex-1 items-center justify-center gap-2"
              >
                <i
                  className={`fas ${tab.icon} text-[14px] transition-colors duration-150 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-[13px] font-medium transition-colors duration-150 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-[7px] h-[2px] w-7 rounded-full bg-gradient-brand"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
              </button>
            );
          })}
    </nav>
  );
}
