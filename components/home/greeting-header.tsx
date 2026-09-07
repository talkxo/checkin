'use client';

import { Bell, LogOut } from 'lucide-react';
import DarkModeToggle from '@/components/dark-mode-toggle';

interface GreetingHeaderProps {
  firstName: string;
  greetingText: string;
  greetingEmoji: string;
  dateLine: string;
  remindersEnabled: boolean;
  onToggleReminders: () => void;
  onLogout: () => void;
}

export default function GreetingHeader({
  firstName,
  greetingText,
  greetingEmoji,
  dateLine,
  remindersEnabled,
  onToggleReminders,
  onLogout,
}: GreetingHeaderProps) {
  return (
    <>
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
            onClick={onToggleReminders}
            className="p-2 rounded-lg hover:bg-muted/80 transition-colors duration-200 focus:outline-none"
            aria-label={remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
            title={remindersEnabled ? 'Reminders ON (10AM & 6:30PM)' : 'Reminders OFF'}
          >
            <Bell className={`w-4 h-4 transition-colors ${remindersEnabled ? 'text-foreground' : 'text-foreground/40'}`} />
          </button>
          <DarkModeToggle />
          <button
            onClick={onLogout}
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
          {greetingText}, {firstName}! {greetingEmoji}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">{dateLine}</p>
      </div>
    </>
  );
}
