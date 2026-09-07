'use client';

import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { installDevBypass, isDevBypassEnabled } from '@/lib/dev-bypass';

// Local-only API mock — a no-op unless dev mode + NEXT_PUBLIC_DEV_BYPASS=true
// (gitignored .env.local). Runs once at module load, before pages fetch.
if (isDevBypassEnabled()) {
  installDevBypass();
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
