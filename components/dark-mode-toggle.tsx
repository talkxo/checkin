'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-foreground" />
      )}
    </button>
  );
}




