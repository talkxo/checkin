'use client';

import React, { useState, useEffect } from 'react';
import AdminLeaveManagement from '@/components/admin-leave-management';
import DarkModeToggle from '@/components/dark-mode-toggle';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AdminLeavePage() {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd get the admin ID from authentication
    // For now, we'll use a placeholder or get it from localStorage
    const storedAdminId = localStorage.getItem('adminId');
    if (storedAdminId) {
      setAdminId(storedAdminId);
    }
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-8">
        <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 text-center fade-in border border-border/50 dark:border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground dark:text-foreground">Loading...</p>
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
                href="/admin"
                className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-foreground dark:text-foreground" />
              </Link>
              <h1 className="text-2xl font-semibold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
                Admin Leave Management
              </h1>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <AdminLeaveManagement currentAdminId={adminId || undefined} />
      </div>
    </div>
  );
}
