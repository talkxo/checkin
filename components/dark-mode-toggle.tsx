'use client';

import React, { useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeContext } from './theme-provider';

export default function DarkModeToggle() {
  // Use useContext directly to avoid throwing error if provider is missing
  const themeContext = useContext(ThemeContext);
  
  // Default to light theme if provider is not available (during SSR)
  const theme = themeContext?.theme || 'light';
  const toggleTheme = themeContext?.toggleTheme || (() => {
    // Fallback: toggle class directly if provider not available
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');
      if (isDark) {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    }
  });

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




