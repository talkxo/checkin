'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Users, Edit, AlertTriangle } from 'lucide-react';
import type { LeaveRequest, LeaveType } from '@/types/leave';

interface AdminLeaveManagementProps {
  currentAdminId?: string;
}

interface LeaveRequestWithDetails extends LeaveRequest {
  employees: {
    full_name: string;
    email?: string;
  };
  leave_types: {
    name: string;
  };
}

export default function AdminLeaveManagement({ currentAdminId }: AdminLeaveManagementProps) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Employee leave management states
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeLeaveBalances, setEmployeeLeaveBalances] = useState<any[]>([]);
  const [showEmployeeLeaveDialog, setShowEmployeeLeaveDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editingBalances, setEditingBalances] = useState<any>({});
  const [isUpdatingBalances, setIsUpdatingBalances] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'employees'>('requests');

  // Fetch all leave requests
  const fetchLeaveRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/leave-requests?status=${statusFilter}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leave requests');
      }

      setLeaveRequests(data.leaveRequests || []);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
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

  // Process leave request directly (approve/reject)
  const processLeaveRequestDirect = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/leave-requests/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId,
          action: action,
          adminId: currentAdminId || '00000000-0000-0000-0000-000000000000' // Default admin ID
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process leave request');
      }

      setSuccess(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      
      // Refresh leave requests
      await fetchLeaveRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };



  // Trigger monthly leave accrual
  const triggerMonthlyAccrual = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/leave/accrual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process monthly accrual');
      }

      setSuccess('Monthly leave accrual processed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process accrual');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
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

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // Fetch employee leave balances
  const fetchEmployeeLeaveBalances = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const concurrency = 6;
      const results: any[] = [];
      let index = 0;

      const worker = async () => {
        while (index < employees.length) {
          const i = index++;
          const employee = employees[i];
          try {
            const response = await fetch(`/api/leave/balance?slug=${employee.slug}&year=${currentYear}`);
            if (response.ok) {
              const data = await response.json();
              results.push({
                employee: data.employee,
                leaveBalance: data.leaveBalance,
                year: data.year
              });
            }
          } catch (err) {
            console.error(`Error fetching balance for ${employee.slug}:`, err);
          }
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, employees.length) }, () => worker());
      await Promise.all(workers);

      setEmployeeLeaveBalances(results);
    } catch (err) {
      console.error('Error fetching employee leave balances:', err);
    }
  };

  // Update employee leave balance
  const updateEmployeeLeaveBalance = async () => {
    if (!selectedEmployee || !editingBalances) return;

    try {
      setIsUpdatingBalances(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/update-leave-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.employee.id,
          year: new Date().getFullYear(),
          leaveBalances: editingBalances
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update leave balance');
      }

      setSuccess('Leave balance updated successfully!');
      setShowEmployeeLeaveDialog(false);
      setSelectedEmployee(null);
      setEditingBalances({});
      
      // Refresh employee leave balances
      await fetchEmployeeLeaveBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update leave balance');
    } finally {
      setIsUpdatingBalances(false);
    }
  };

  // Open employee leave edit dialog
  const openEmployeeLeaveDialog = (employeeData: any) => {
    setSelectedEmployee(employeeData);
    const initialBalances: any = {};
    employeeData.leaveBalance.forEach((balance: any) => {
      initialBalances[balance.leave_type_name] = {
        total_entitlement: balance.total_entitlement,
        used_leaves: balance.used_leaves,
        pending_leaves: balance.pending_leaves
      };
    });
    setEditingBalances(initialBalances);
    setShowEmployeeLeaveDialog(true);
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveTypes();
    fetchEmployees();
  }, [statusFilter]);

  useEffect(() => {
    if (employees.length > 0) {
      fetchEmployeeLeaveBalances();
    }
  }, [employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-card dark:bg-card rounded-2xl elevation-lg p-8 text-center fade-in border border-border/50 dark:border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground dark:text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-lg border border-border/50 dark:border-border">
        <Button
          variant={activeTab === 'requests' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('requests')}
          className="flex-1"
        >
          <Clock className="w-4 h-4 mr-2" />
          Leave Requests
        </Button>
        <Button
          variant={activeTab === 'employees' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('employees')}
          className="flex-1"
        >
          <Users className="w-4 h-4 mr-2" />
          Employee Leave Balances
        </Button>
      </div>

      {/* Monthly Accrual Button */}
      <div className="flex justify-end">
        <Button onClick={triggerMonthlyAccrual} disabled={isProcessing}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Process Monthly Accrual
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 dark:border-destructive/50 bg-destructive/10 dark:bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-destructive dark:text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Requests Tab Content */}
      {activeTab === 'requests' && (
        <Card className="bg-card dark:bg-card border border-border/50 dark:border-border elevation-md">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Leave Requests</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">
              Review and manage employee leave requests
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="statusFilter">Filter by Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchLeaveRequests}>
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.employees.full_name}</div>
                      {request.employees.email && (
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">{request.employees.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{request.leave_types.name}</TableCell>
                  <TableCell>
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </TableCell>
                  <TableCell>{request.total_days} days</TableCell>
                  <TableCell>
                    {request.reason ? (
                      <span className="text-sm text-muted-foreground dark:text-muted-foreground" title={request.reason}>
                        {request.reason.length > 30 ? `${request.reason.substring(0, 30)}...` : request.reason}
                      </span>
                    ) : (
                      <span className="text-muted-foreground dark:text-muted-foreground">No reason provided</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processLeaveRequestDirect(request.id, 'approve')}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processLeaveRequestDirect(request.id, 'reject')}
                          disabled={isProcessing}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {leaveRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
              No leave requests found for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Employee Leave Balances Tab Content */}
      {activeTab === 'employees' && (
        <Card className="bg-card dark:bg-card border border-border/50 dark:border-border elevation-md">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>Employee Leave Balances</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">
              View and edit employee leave balances for {new Date().getFullYear()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Button variant="outline" onClick={fetchEmployeeLeaveBalances}>
                Refresh
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Privilege Leave</TableHead>
                  <TableHead>Sick Leave</TableHead>
                  <TableHead>Bonus Leave</TableHead>
                  <TableHead>Total Available</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaveBalances.map((employeeData) => {
                  const privilegeLeave = employeeData.leaveBalance.find((lb: any) => lb.leave_type_name === 'Privilege Leave');
                  const sickLeave = employeeData.leaveBalance.find((lb: any) => lb.leave_type_name === 'Sick Leave');
                  const bonusLeave = employeeData.leaveBalance.find((lb: any) => lb.leave_type_name === 'Bonus Leave');
                  
                  const totalAvailable = (privilegeLeave?.available_leaves || 0) + 
                                       (sickLeave?.available_leaves || 0) + 
                                       (bonusLeave?.available_leaves || 0);

                  return (
                    <TableRow key={employeeData.employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground dark:text-foreground">{employeeData.employee.full_name}</div>
                          <div className="text-sm text-muted-foreground dark:text-muted-foreground">{employeeData.employee.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-foreground dark:text-foreground">{privilegeLeave?.available_leaves || 0}</div>
                          <div className="text-muted-foreground dark:text-muted-foreground">
                            {privilegeLeave?.used_leaves || 0} used • {privilegeLeave?.pending_leaves || 0} pending
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-foreground dark:text-foreground">{sickLeave?.available_leaves || 0}</div>
                          <div className="text-muted-foreground dark:text-muted-foreground">
                            {sickLeave?.used_leaves || 0} used • {sickLeave?.pending_leaves || 0} pending
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-foreground dark:text-foreground">{bonusLeave?.available_leaves || 0}</div>
                          <div className="text-muted-foreground dark:text-muted-foreground">
                            {bonusLeave?.used_leaves || 0} used • {bonusLeave?.pending_leaves || 0} pending
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-primary dark:text-primary">{totalAvailable} days</div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEmployeeLeaveDialog(employeeData)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {employeeLeaveBalances.length === 0 && (
              <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
                No employee leave balances found.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Employee Leave Edit Dialog */}
      <Dialog open={showEmployeeLeaveDialog} onOpenChange={setShowEmployeeLeaveDialog}>
        <DialogContent className="max-w-2xl bg-card dark:bg-card border border-border/50 dark:border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              Edit Leave Balance - {selectedEmployee?.employee?.full_name}
            </DialogTitle>
            <DialogDescription>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">Warning: Direct System Edit</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      This action directly modifies the leave balance in the system. 
                      This is a hard edit that bypasses normal leave request workflows. 
                      Please ensure you have proper authorization and documentation for this change.
                    </p>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4">
              {selectedEmployee.leaveBalance.map((balance: any) => (
                <div key={balance.leave_type_name} className="border border-border/50 dark:border-border rounded-lg p-4 bg-muted/30 dark:bg-muted/20">
                  <h4 className="font-semibold mb-3 text-foreground dark:text-foreground">{balance.leave_type_name}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`total_${balance.leave_type_name}`} className="text-foreground dark:text-foreground">Total Entitlement</Label>
                      <input
                        id={`total_${balance.leave_type_name}`}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-input dark:border-input rounded-md text-sm bg-background dark:bg-background text-foreground dark:text-foreground"
                        value={editingBalances[balance.leave_type_name]?.total_entitlement || 0}
                        onChange={(e) => setEditingBalances({
                          ...editingBalances,
                          [balance.leave_type_name]: {
                            ...editingBalances[balance.leave_type_name],
                            total_entitlement: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`used_${balance.leave_type_name}`} className="text-foreground dark:text-foreground">Used Leaves</Label>
                      <input
                        id={`used_${balance.leave_type_name}`}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-input dark:border-input rounded-md text-sm bg-background dark:bg-background text-foreground dark:text-foreground"
                        value={editingBalances[balance.leave_type_name]?.used_leaves || 0}
                        onChange={(e) => setEditingBalances({
                          ...editingBalances,
                          [balance.leave_type_name]: {
                            ...editingBalances[balance.leave_type_name],
                            used_leaves: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`pending_${balance.leave_type_name}`} className="text-foreground dark:text-foreground">Pending Leaves</Label>
                      <input
                        id={`pending_${balance.leave_type_name}`}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-input dark:border-input rounded-md text-sm bg-background dark:bg-background text-foreground dark:text-foreground"
                        value={editingBalances[balance.leave_type_name]?.pending_leaves || 0}
                        onChange={(e) => setEditingBalances({
                          ...editingBalances,
                          [balance.leave_type_name]: {
                            ...editingBalances[balance.leave_type_name],
                            pending_leaves: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                    Available: {Math.max(0, (editingBalances[balance.leave_type_name]?.total_entitlement || 0) - 
                                          (editingBalances[balance.leave_type_name]?.used_leaves || 0) - 
                                          (editingBalances[balance.leave_type_name]?.pending_leaves || 0))} days
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEmployeeLeaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={updateEmployeeLeaveBalance}
              disabled={isUpdatingBalances}
              variant="destructive"
            >
              {isUpdatingBalances ? 'Updating...' : 'Update Leave Balance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
