'use client';

import { useRef } from 'react';

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
 * 80dp nav bar, sized for inline icon+label items). Rendered sticky inside
 * the content column's flow: it floats at the viewport bottom while the page
 * scrolls, and because it lives IN the column, its center is the column's
 * center at every width — no fixed-position viewport math to drift out of
 * sync with the cards (scrollbar gutters etc.).
 *
 * Selection is color-only: each label transitions per character with a
 * directional stagger, so the tint drains out of the old tab and fills the
 * new one in the direction of the switch.
 */
export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const prev = useRef<{ index: number; dir: number }>({ index: activeIndex, dir: 1 });
  const dir =
    activeIndex === prev.current.index
      ? prev.current.dir
      : Math.sign(activeIndex - prev.current.index) || 1;
  if (activeIndex !== prev.current.index) {
    prev.current = { index: activeIndex, dir };
  }

  return (
    <nav className="pointer-events-none sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mt-4 flex justify-center">
      <div className="glass-strong pointer-events-auto flex h-16 w-fit max-w-full items-center justify-center gap-5 rounded-full px-5 sm:gap-8">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex h-full items-center justify-center gap-2 px-1"
            >
              <i
                className={`fas ${tab.icon} text-[14px] transition-colors duration-500 ease-out ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span className="text-[13px] font-medium">
                {tab.label.split('').map((ch, i) => (
                  <span
                    key={i}
                    className={`transition-colors duration-[400ms] ease-out ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    style={{ transitionDelay: `${i * 35 * dir}ms` }}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
