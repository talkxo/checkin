'use client';

import React, { useState, useEffect } from 'react';
import AdminLeaveManagement from '@/components/admin-leave-management';

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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminLeaveManagement currentAdminId={adminId || undefined} />
    </div>
  );
}
