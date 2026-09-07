'use client';

import OptionsMenu from '@/components/home/options-menu';

interface GreetingHeaderProps {
  recordName: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  greetingText: string;
  greetingEmoji: string;
  dateLine: string;
  remindersEnabled: boolean;
  onToggleReminders: () => void;
  onLogout: () => void;
}

export default function GreetingHeader({
  recordName,
  displayName,
  onDisplayNameChange,
  greetingText,
  greetingEmoji,
  dateLine,
  remindersEnabled,
  onToggleReminders,
  onLogout,
}: GreetingHeaderProps) {
  return (
    <>
      {/* Header: logo + sandwich menu */}
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 flex items-center justify-center">
          <img
            src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
            alt="insyde"
            className="w-8 h-8 object-contain"
          />
        </div>
        <OptionsMenu
          recordName={recordName}
          displayName={displayName}
          onDisplayNameChange={onDisplayNameChange}
          remindersEnabled={remindersEnabled}
          onToggleReminders={onToggleReminders}
          onLogout={onLogout}
        />
      </div>

      {/* Greeting Section */}
      <div>
        <h1 className="text-[30px] font-bold leading-tight text-greeting" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
          {greetingText}, {displayName}! {greetingEmoji}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">{dateLine}</p>
      </div>
    </>
  );
}
