'use client';

import React, { useState, useEffect } from 'react';
import LeaveManagement from '@/components/leave-management';
import DarkModeToggle from '@/components/dark-mode-toggle';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LeavePage() {
  const [employeeSlug, setEmployeeSlug] = useState<string | null>(null);
  const [employeeEmail, setEmployeeEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    // Try to get employee info from localStorage or URL params
    const storedSlug = localStorage.getItem('userSlug');
    const storedEmail = localStorage.getItem('userEmail');
    
    if (storedSlug) {
      setEmployeeSlug(storedSlug);
    }
    if (storedEmail) {
      setEmployeeEmail(storedEmail);
    }
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-8">
        <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground dark:text-foreground">Loading leave management...</p>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 slide-up border border-border/50 dark:border-border">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-foreground dark:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-4" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Leave Management System</h1>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6">
                The Leave Management system needs to be set up. Please run the database migration and initialization script.
              </p>
              <div className="bg-muted/50 dark:bg-muted/30 border border-border/50 dark:border-border rounded-xl p-6 text-left">
                <h3 className="font-semibold text-foreground dark:text-foreground mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Setup Instructions:
                </h3>
                <ol className="text-sm text-muted-foreground dark:text-muted-foreground space-y-2">
                  <li className="flex items-start">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    <span>Run the database migration: <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">supabase_leave_migration.sql</code></span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    <span>Initialize the system: <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">npm run initialize-leave</code></span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    <span>Refresh this page</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 dark:bg-background/80 backdrop-blur-sm border-b border-border/50 dark:border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-foreground dark:text-foreground" />
              </Link>
              <h1 className="text-2xl font-semibold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                Leave Management
              </h1>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <LeaveManagement 
          employeeSlug={employeeSlug || undefined}
          employeeEmail={employeeEmail || undefined}
        />
      </div>
    </div>
  );
}
