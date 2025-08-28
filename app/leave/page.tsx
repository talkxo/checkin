'use client';

import React, { useState, useEffect } from 'react';
import LeaveManagement from '@/components/leave-management';
import { Moon, Sun } from 'lucide-react';

export default function LeavePage() {
  const [employeeSlug, setEmployeeSlug] = useState<string | null>(null);
  const [employeeEmail, setEmployeeEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    
    // Check for dark mode preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark));
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Apply dark mode to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading leave management...</p>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Leave Management System</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The Leave Management system needs to be set up. Please run the database migration and initialization script.
              </p>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6 text-left">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Setup Instructions:
                </h3>
                <ol className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                  <li className="flex items-start">
                    <span className="bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    <span>Run the database migration: <code className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded text-xs font-mono">supabase_leave_migration.sql</code></span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    <span>Initialize the system: <code className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded text-xs font-mono">npm run initialize-leave</code></span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header with Logo and Theme Toggle */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-cal-sans text-2xl md:text-3xl font-semibold text-purple-600 dark:text-purple-400 tracking-tight">
              insyde
            </h1>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
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
