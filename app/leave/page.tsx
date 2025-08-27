'use client';

import React, { useState, useEffect } from 'react';
import LeaveManagement from '@/components/leave-management';

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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Leave Management System</h1>
              <p className="text-gray-600 mb-6">
                The Leave Management system needs to be set up. Please run the database migration and initialization script.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Run the database migration: <code className="bg-blue-100 px-1 rounded">supabase_leave_migration.sql</code></li>
                  <li>2. Initialize the system: <code className="bg-blue-100 px-1 rounded">npm run initialize-leave</code></li>
                  <li>3. Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <LeaveManagement 
        employeeSlug={employeeSlug || undefined}
        employeeEmail={employeeEmail || undefined}
      />
    </div>
  );
}
