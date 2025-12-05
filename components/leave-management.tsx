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

      // If no identifier is available yet, don't call the API
      if (!employeeSlug && !employeeEmail) {
        setIsLoading(false);
        return;
      }

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
        return <Badge variant="outline" className="border-border dark:border-border text-muted-foreground dark:text-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
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
        <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 text-center fade-in border border-border/50 dark:border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground dark:text-foreground">Loading your leave information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-destructive/50 dark:border-destructive/50 bg-destructive/10 dark:bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 text-destructive dark:text-destructive">
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
        <Card className="bg-card dark:bg-card border border-border/50 dark:border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-muted dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">No Leave Data Available</h3>
            <p className="text-muted-foreground dark:text-muted-foreground">Your leave information could not be loaded. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-card dark:bg-card rounded-2xl elevation-md p-6 slide-up border border-border/50 dark:border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Manage Leaves</h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-1">
              Hi, {leaveData.employee.full_name.split(' ')[0]}! 👋
            </p>
          </div>
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl elevation-md hover:elevation-lg transition-all duration-200 md:px-6 md:py-3 flex items-center justify-center min-w-[48px] md:min-w-[140px]">
                <Plus className="w-5 h-5 md:w-5 md:h-5" />
                <span className="hidden md:inline ml-2">Request Leave</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card dark:bg-card border border-border/50 dark:border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Request Leave</DialogTitle>
                <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
                  Submit a new leave request. Make sure you have sufficient balance.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leaveType" className="text-sm font-medium text-foreground dark:text-foreground">Leave Type</Label>
                  <Select
                    value={requestForm.leaveTypeId}
                    onValueChange={(value) => setRequestForm({ ...requestForm, leaveTypeId: value })}
                  >
                    <SelectTrigger className="border-input dark:border-input focus:border-primary focus:ring-primary">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate" className="text-sm font-medium text-foreground dark:text-foreground">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      className="border-input dark:border-input focus:border-primary focus:ring-primary"
                      value={requestForm.startDate}
                      onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate" className="text-sm font-medium text-foreground dark:text-foreground">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      className="border-input dark:border-input focus:border-primary focus:ring-primary"
                      value={requestForm.endDate}
                      onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason" className="text-sm font-medium text-foreground dark:text-foreground">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    className="border-input dark:border-input focus:border-primary focus:ring-primary min-h-[100px] resize-none"
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    placeholder="Brief reason for leave..."
                  />
                </div>
              </div>
              {error && (
                <div className="bg-destructive/10 dark:bg-destructive/10 border border-destructive/50 dark:border-destructive/50 rounded-lg p-3 text-destructive dark:text-destructive text-sm">{error}</div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-600 dark:text-green-400 text-sm">{success}</div>
              )}
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  className="border-border dark:border-border text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
      <div className="bg-card dark:bg-card rounded-2xl elevation-md p-6 slide-up border border-border/50 dark:border-border">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary dark:text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Leave Balance Overview</h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">Your current leave balance for {leaveData.year}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaveData.leaveBalance.map((balance) => (
            <div key={balance.leave_type_name} className="bg-muted/30 dark:bg-muted/20 border border-border/50 dark:border-border rounded-xl p-4 hover:elevation-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground dark:text-foreground">
                  {balance.leave_type_name}
                </span>
                <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-3 h-3 text-primary dark:text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground dark:text-foreground mb-2">
                {balance.available_leaves}
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground mb-3">
                {balance.used_leaves} used • {balance.pending_leaves} pending
              </div>
              <div className="w-full bg-muted dark:bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${balance.total_entitlement > 0 ? (balance.available_leaves / balance.total_entitlement) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50 dark:border-border">
          <div className="flex items-center justify-between bg-muted/50 dark:bg-muted/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <span className="text-base font-semibold text-foreground dark:text-foreground">Total Available</span>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">All leave types combined</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary dark:text-primary">
              {getTotalAvailableLeaves()} days
            </span>
          </div>
        </div>
      </div>

      {/* Bonus Leave Accrual History */}
      {leaveData.accrualHistory.length > 0 && (
        <div className="bg-card dark:bg-card rounded-2xl elevation-md p-6 slide-up border border-border/50 dark:border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Bonus Leave Accrual History</h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Track your bonus leaves earned from extra office attendance</p>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-border/50 dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 dark:bg-muted/30">
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Month</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Extra Office Days</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Bonus Leaves Earned</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Calculation Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveData.accrualHistory.map((accrual) => (
                  <TableRow key={accrual.id} className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-foreground dark:text-foreground">
                      {new Date(2024, accrual.month - 1).toLocaleDateString('en-IN', { month: 'long' })}
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-muted-foreground">{accrual.extra_office_days} days</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
                        {accrual.accrued_leaves} leaves
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-muted-foreground">{formatDate(accrual.calculation_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Recent Leave Requests */}
      {leaveData.pendingRequests.length > 0 && (
        <div className="bg-card dark:bg-card rounded-2xl elevation-md p-6 slide-up border border-border/50 dark:border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary dark:text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Recent Leave Requests</h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Your recent leave requests and their status</p>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-border/50 dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 dark:bg-muted/30">
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Leave Type</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Date Range</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Days</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-foreground">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveData.pendingRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-foreground dark:text-foreground">
                      {request.leave_types?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-muted-foreground">
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-muted-foreground">{request.total_days} days</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-muted-foreground dark:text-muted-foreground">{formatDate(request.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50 dark:border-border hover:elevation-md transition-shadow duration-200 bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                <Info className="w-3 h-3 text-primary dark:text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground dark:text-foreground">How Bonus Leaves Work</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground dark:text-muted-foreground">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>For every 3 extra office days, you earn 1 bonus leave</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Maximum 15 bonus leaves per calendar year</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Only completed office sessions are counted</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Accrual is calculated monthly</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 dark:border-border hover:elevation-md transition-shadow duration-200 bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-3 h-3 text-primary dark:text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground dark:text-foreground">Leave Request Process</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground dark:text-muted-foreground">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Submit request with sufficient balance</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Requests are reviewed by management</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Approved leaves are deducted from balance</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Weekend days are automatically excluded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
