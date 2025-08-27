'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { 
  LeaveBalanceResponse, 
  LeaveType, 
  LeaveRequestFormData,
  LeaveRequest 
} from '@/types/leave';

interface LeaveManagementProps {
  employeeSlug?: string;
  employeeEmail?: string;
}

export default function LeaveManagement({ employeeSlug, employeeEmail }: LeaveManagementProps) {
  const [leaveData, setLeaveData] = useState<LeaveBalanceResponse | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState<LeaveRequestFormData>({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch leave data
  const fetchLeaveData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (employeeSlug) params.append('slug', employeeSlug);
      if (employeeEmail) params.append('email', employeeEmail);
      params.append('year', new Date().getFullYear().toString());

      const response = await fetch(`/api/leave/balance?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500 && errorData.error?.includes('relation')) {
          throw new Error('Database setup required. Please run the migration and initialization script.');
        }
        throw new Error(errorData.error || 'Failed to fetch leave data');
      }

      const data = await response.json();
      setLeaveData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch leave types
  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave/types');
      if (!response.ok) {
        throw new Error('Failed to fetch leave types');
      }

      const data = await response.json();
      setLeaveTypes(data.leaveTypes);
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  // Submit leave request
  const submitLeaveRequest = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const requestBody = {
        ...requestForm,
        ...(employeeSlug && { slug: employeeSlug }),
        ...(employeeEmail && { email: employeeEmail })
      };

      const response = await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setSuccess('Leave request submitted successfully!');
      setShowRequestDialog(false);
      setRequestForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      
      // Refresh leave data
      await fetchLeaveData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total available leaves
  const getTotalAvailableLeaves = () => {
    if (!leaveData?.leaveBalance) return 0;
    return leaveData.leaveBalance.reduce((total, balance) => total + balance.available_leaves, 0);
  };

  // Get status badge for leave request
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="notion-badge notion-badge-warning"><Clock className="w-3 h-3 mr-1" />Pending</span>;
      case 'approved':
        return <span className="notion-badge notion-badge-success"><CheckCircle className="w-3 h-3 mr-1" />Approved</span>;
      case 'rejected':
        return <span className="notion-badge notion-badge-danger"><XCircle className="w-3 h-3 mr-1" />Rejected</span>;
      case 'cancelled':
        return <span className="notion-badge notion-badge-outline"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</span>;
      default:
        return <span className="notion-badge notion-badge-outline">{status}</span>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchLeaveData();
    fetchLeaveTypes();
  }, [employeeSlug, employeeEmail]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaveData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">No leave data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Leave Management</h2>
          <p className="text-sm text-gray-600">
            Welcome back, {leaveData.employee.full_name}
          </p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <button className="notion-button-primary">
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request. Make sure you have sufficient balance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="leaveType" className="text-sm font-medium text-gray-700">Leave Type</label>
                <Select
                  value={requestForm.leaveTypeId}
                  onValueChange={(value) => setRequestForm({ ...requestForm, leaveTypeId: value })}
                >
                  <SelectTrigger className="notion-input">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  className="notion-input"
                  value={requestForm.startDate}
                  onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  className="notion-input"
                  value={requestForm.endDate}
                  onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="reason" className="text-sm font-medium text-gray-700">Reason (Optional)</label>
                <textarea
                  id="reason"
                  className="notion-input min-h-[80px] resize-none"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  placeholder="Brief reason for leave..."
                />
              </div>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            {success && (
              <div className="text-green-600 text-sm">{success}</div>
            )}
            <div className="flex justify-end space-x-2">
              <button 
                className="notion-button-secondary" 
                onClick={() => setShowRequestDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="notion-button-primary"
                onClick={submitLeaveRequest} 
                disabled={isSubmitting || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Overview */}
      <div className="notion-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Leave Balance Overview</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">Your current leave balance for {leaveData.year}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaveData.leaveBalance.map((balance) => (
            <div key={balance.leave_type_name} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {balance.leave_type_name}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {balance.available_leaves}
              </div>
              <div className="text-xs text-gray-500">
                {balance.used_leaves} used • {balance.pending_leaves} pending
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${balance.total_entitlement > 0 ? (balance.available_leaves / balance.total_entitlement) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Total Available</span>
            <span className="text-2xl font-bold text-purple-600">
              {getTotalAvailableLeaves()} days
            </span>
          </div>
        </div>
      </div>

      {/* Bonus Leave Accrual History */}
      {leaveData.accrualHistory.length > 0 && (
        <div className="notion-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Bonus Leave Accrual History</h3>
          <p className="text-sm text-gray-600 mb-4">Track your bonus leaves earned from extra office attendance</p>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Month</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Extra Office Days</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Bonus Leaves Earned</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Calculation Date</th>
                </tr>
              </thead>
              <tbody>
                {leaveData.accrualHistory.map((accrual) => (
                  <tr key={accrual.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-900 text-sm">
                      {new Date(2024, accrual.month - 1).toLocaleDateString('en-IN', { month: 'long' })}
                    </td>
                    <td className="px-3 py-2">{accrual.extra_office_days} days</td>
                    <td className="px-3 py-2">
                      <span className="notion-badge notion-badge-primary">{accrual.accrued_leaves} leaves</span>
                    </td>
                    <td className="px-3 py-2">{formatDate(accrual.calculation_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Leave Requests */}
      {leaveData.pendingRequests.length > 0 && (
        <div className="notion-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Leave Requests</h3>
          <p className="text-sm text-gray-600 mb-4">Your recent leave requests and their status</p>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Leave Type</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Date Range</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Days</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {leaveData.pendingRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-900 text-sm">{request.leave_types?.name || 'Unknown'}</td>
                    <td className="px-3 py-2">
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </td>
                    <td className="px-3 py-2">{request.total_days} days</td>
                    <td className="px-3 py-2">{getStatusBadge(request.status)}</td>
                    <td className="px-3 py-2">{formatDate(request.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Bonus Leaves Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• For every 3 extra office days, you earn 1 bonus leave</p>
            <p>• Maximum 15 bonus leaves per calendar year</p>
            <p>• Only completed office sessions are counted</p>
            <p>• Accrual is calculated monthly</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave Request Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Submit request with sufficient balance</p>
            <p>• Requests are reviewed by management</p>
            <p>• Approved leaves are deducted from balance</p>
            <p>• Weekend days are automatically excluded</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
