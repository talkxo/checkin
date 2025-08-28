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
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, CalendarDays, FileText, Info } from 'lucide-react';
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
        return <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your leave information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Error Loading Leave Data</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!leaveData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leave Data Available</h3>
            <p className="text-gray-600 dark:text-gray-300">Your leave information could not be loaded. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 slide-up border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Leaves</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Hi, {leaveData.employee.full_name.split(' ')[0]}! 👋
            </p>
          </div>
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 md:px-6 md:py-3 flex items-center justify-center min-w-[48px] md:min-w-[140px]">
                <Plus className="w-5 h-5 md:w-5 md:h-5" />
                <span className="hidden md:inline ml-2">Request Leave</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl dark:bg-gray-800 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold dark:text-white">Request Leave</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  Submit a new leave request. Make sure you have sufficient balance.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leaveType" className="text-sm font-medium text-gray-700 dark:text-gray-300">Leave Type</Label>
                  <Select
                    value={requestForm.leaveTypeId}
                    onValueChange={(value) => setRequestForm({ ...requestForm, leaveTypeId: value })}
                  >
                    <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="dark:text-white dark:hover:bg-gray-600">
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      value={requestForm.startDate}
                      onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      value={requestForm.endDate}
                      onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 min-h-[100px] resize-none dark:bg-gray-700 dark:text-white"
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    placeholder="Brief reason for leave..."
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">{error}</div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-600 dark:text-green-400 text-sm">{success}</div>
              )}
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={submitLeaveRequest} 
                  disabled={isSubmitting || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Leave Balance Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 slide-up border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Leave Balance Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Your current leave balance for {leaveData.year}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaveData.leaveBalance.map((balance) => (
            <div key={balance.leave_type_name} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {balance.leave_type_name}
                </span>
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {balance.available_leaves}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {balance.used_leaves} used • {balance.pending_leaves} pending
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${balance.total_entitlement > 0 ? (balance.available_leaves / balance.total_entitlement) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-base font-semibold text-gray-900 dark:text-white">Total Available</span>
                <p className="text-xs text-gray-600 dark:text-gray-300">All leave types combined</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {getTotalAvailableLeaves()} days
            </span>
          </div>
        </div>
      </div>

      {/* Bonus Leave Accrual History */}
      {leaveData.accrualHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 slide-up border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bonus Leave Accrual History</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Track your bonus leaves earned from extra office attendance</p>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-700">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Month</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Extra Office Days</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Bonus Leaves Earned</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Calculation Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveData.accrualHistory.map((accrual) => (
                  <TableRow key={accrual.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {new Date(2024, accrual.month - 1).toLocaleDateString('en-IN', { month: 'long' })}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{accrual.extra_office_days} days</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
                        {accrual.accrued_leaves} leaves
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{formatDate(accrual.calculation_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Recent Leave Requests */}
      {leaveData.pendingRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 slide-up border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Leave Requests</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Your recent leave requests and their status</p>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-700">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Leave Type</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Date Range</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Days</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveData.pendingRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {request.leave_types?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{request.total_days} days</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{formatDate(request.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Info className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">How Bonus Leaves Work</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>For every 3 extra office days, you earn 1 bonus leave</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Maximum 15 bonus leaves per calendar year</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Only completed office sessions are counted</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Accrual is calculated monthly</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Leave Request Process</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Submit request with sufficient balance</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Requests are reviewed by management</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Approved leaves are deducted from balance</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p>Weekend days are automatically excluded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
