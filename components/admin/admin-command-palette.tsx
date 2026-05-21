'use client';

import * as React from 'react';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  Action,
} from 'kbar';
import { useRouter } from 'next/navigation';
import { ThemeContext } from '../theme-provider';

export function AdminCommandPalette({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const themeContext = React.useContext(ThemeContext);

  const actions: Action[] = [
    {
      id: 'overview',
      name: 'Go to Overview',
      shortcut: ['g', 'o'],
      keywords: 'dashboard overview home',
      perform: () => router.push('/admin?tab=overview'),
    },
    {
      id: 'attendance',
      name: 'Go to Attendance',
      shortcut: ['g', 'a'],
      keywords: 'attendance list report',
      perform: () => router.push('/admin?tab=attendance'),
    },
    {
      id: 'people',
      name: 'Go to People',
      shortcut: ['g', 'p'],
      keywords: 'users employees roster team',
      perform: () => router.push('/admin?tab=people'),
    },
    {
      id: 'leave',
      name: 'Go to Leave',
      shortcut: ['g', 'l'],
      keywords: 'leave requests exceptions',
      perform: () => router.push('/admin?tab=leave'),
    },
    {
      id: 'ai',
      name: 'Go to Assistive AI',
      shortcut: ['g', 'i'],
      keywords: 'ai insights report sentiment',
      perform: () => router.push('/admin?tab=ai'),
    },
    {
      id: 'theme',
      name: 'Toggle Dark Mode',
      shortcut: ['t', 'd'],
      keywords: 'theme dark mode light',
      perform: () => {
        if (themeContext?.toggleTheme) {
          themeContext.toggleTheme();
        } else {
          // Fallback if provider not working
          const root = document.documentElement;
          if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
          } else {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          }
        }
      },
    },
  ];

  return (
    <KBarProvider actions={actions}>
      <CommandPaletteUI />
      {children}
    </KBarProvider>
  );
}

function CommandPaletteUI() {
  return (
    <KBarPortal>
      <KBarPositioner className="z-[100] fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <KBarAnimator className="w-full max-w-xl bg-background rounded-xl shadow-2xl overflow-hidden border border-border/50">
          <KBarSearch 
            className="w-full px-6 py-4 text-lg bg-transparent border-b border-border/50 outline-none text-foreground placeholder:text-muted-foreground"
            defaultPlaceholder="Type a command or search..."
          />
          <div className="py-2">
            <RenderResults />
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

function RenderResults() {
  const { results, rootActionId } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        if (typeof item === 'string') {
          return (
            <div className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {item}
            </div>
          );
        }

        const action = item;

        return (
          <div
            className={`px-6 py-3 flex items-center justify-between cursor-pointer transition-colors ${
              active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {action.icon && action.icon}
              <div className="flex flex-col">
                <span className="font-medium">{action.name}</span>
                {action.subtitle && (
                  <span className="text-sm text-muted-foreground">{action.subtitle}</span>
                )}
              </div>
            </div>
            {action.shortcut?.length ? (
              <div className="flex gap-1">
                {action.shortcut.map((sc) => (
                  <kbd
                    key={sc}
                    className="px-2 py-1 bg-muted rounded-md text-xs font-mono border border-border/50 text-muted-foreground"
                  >
                    {sc}
                  </kbd>
                ))}
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
}
