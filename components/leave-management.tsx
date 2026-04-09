'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Calendar, CheckCircle, Clock, Plus, XCircle } from 'lucide-react';
import { formatISTDateLong, formatISTDateShort } from '@/lib/time';
import type { LeaveBalanceResponse, LeaveRequestFormData, LeaveType } from '@/types/leave';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="text-2xl font-semibold leading-tight text-foreground">{title}</h2>
      {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold leading-none text-foreground [font-variant-numeric:tabular-nums]">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground [font-variant-numeric:tabular-nums]">{value}</dd>
    </div>
  );
}

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
    reason: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchLeaveData = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

  const submitLeaveRequest = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const requestBody = {
        ...requestForm,
        ...(employeeSlug && { slug: employeeSlug }),
        ...(employeeEmail && { email: employeeEmail }),
      };

      const response = await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setSuccess('Leave request submitted successfully!');
      setShowRequestDialog(false);
      setRequestForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      await fetchLeaveData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalAvailableLeaves = () => {
    if (!leaveData?.leaveBalance) return 0;
    return leaveData.leaveBalance.reduce((total, balance) => total + balance.available_leaves, 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="border-green-200 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="border-red-200 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-border text-muted-foreground">
            <AlertCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    fetchLeaveData();
    fetchLeaveTypes();
  }, [employeeSlug, employeeEmail]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-foreground">Loading your leave information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-3xl border-destructive/50 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 text-destructive">
              <AlertCircle className="mt-0.5 h-6 w-6" />
              <div>
                <h3 className="font-semibold">Error Loading Leave Data</h3>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!leaveData) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-3xl border border-border/60 bg-card">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">No Leave Data Available</h3>
            <p className="text-muted-foreground">Your leave information could not be loaded. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingRequestCount = leaveData.pendingRequests.filter((request) => request.status === 'pending').length;
  const approvedRequestCount = leaveData.pendingRequests.filter((request) => request.status === 'approved').length;
  const bonusLeavesEarned = leaveData.accrualHistory.reduce((total, accrual) => total + accrual.accrued_leaves, 0);

  return (
    <div className="space-y-6 pb-6">
      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex justify-end">
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border border-border/60 bg-card sm:max-w-[540px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground">Request Leave</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Submit a new leave request. Make sure you have sufficient balance.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="leaveType" className="text-sm font-medium text-foreground">Leave Type</Label>
                  <Select value={requestForm.leaveTypeId} onValueChange={(value) => setRequestForm({ ...requestForm, leaveTypeId: value })}>
                    <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate" className="text-sm font-medium text-foreground">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      className="border-input focus:border-primary focus:ring-primary"
                      value={requestForm.startDate}
                      onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate" className="text-sm font-medium text-foreground">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      className="border-input focus:border-primary focus:ring-primary"
                      value={requestForm.endDate}
                      onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason" className="text-sm font-medium text-foreground">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    className="min-h-[120px] resize-none border-input focus:border-primary focus:ring-primary"
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    placeholder="Brief reason for leave..."
                  />
                </div>
              </div>

              {error ? <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
              {success ? <div className="rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm text-foreground">{success}</div> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setShowRequestDialog(false)} className="border-border text-foreground hover:bg-muted">
                  Cancel
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={submitLeaveRequest}
                  disabled={isSubmitting || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {(error || success) ? (
          <div className="mt-5 space-y-2">
            {error ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
            {success ? <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground">{success}</div> : null}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile label="Available" value={`${getTotalAvailableLeaves()}`} />
          <SummaryTile label="Pending" value={`${pendingRequestCount}`} />
          <SummaryTile label="Approved" value={`${approvedRequestCount}`} />
          <SummaryTile label="Bonus" value={`${bonusLeavesEarned}`} />
        </div>
      </section>

      {leaveData.leaveBalance.length > 0 ? (
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <SectionHeader eyebrow="Balance" title="By leave type" />
          </div>

          <div className="space-y-3">
            {leaveData.leaveBalance.map((balance) => {
              const progress = balance.total_entitlement > 0 ? Math.min((balance.available_leaves / balance.total_entitlement) * 100, 100) : 0;

              return (
                <article key={balance.leave_type_name} className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold leading-tight text-foreground">{balance.leave_type_name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {balance.used_leaves} used and {balance.pending_leaves} pending
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Available</p>
                        <p className="mt-1 text-2xl font-semibold leading-none text-foreground [font-variant-numeric:tabular-nums]">
                          {balance.available_leaves}
                        </p>
                      </div>
                    </div>

                    <dl className="divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/20 px-3">
                      <DetailRow label="Used" value={`${balance.used_leaves}`} />
                      <DetailRow label="Pending" value={`${balance.pending_leaves}`} />
                      <DetailRow label="Total entitlement" value={`${balance.total_entitlement}`} />
                    </dl>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Remaining balance</span>
                        <span className="font-medium text-foreground">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {leaveData.accrualHistory.length > 0 ? (
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <SectionHeader eyebrow="History" title="Bonus leave accrual" />
          </div>

          <div className="space-y-3">
            {leaveData.accrualHistory.map((accrual) => (
              <article key={accrual.id} className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {MONTH_LABELS[accrual.month - 1] || `Month ${accrual.month}`}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">Calculated {formatISTDateShort(accrual.calculation_date)}</p>
                  </div>
                  <Badge className="border-primary/20 bg-primary/10 text-foreground">{accrual.accrued_leaves} leaves</Badge>
                </div>
                <dl className="mt-4 divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/20 px-3">
                  <DetailRow label="Extra office days" value={`${accrual.extra_office_days}`} />
                  <DetailRow label="Bonus earned" value={`${accrual.accrued_leaves}`} />
                  <DetailRow label="Calculated" value={formatISTDateShort(accrual.calculation_date)} />
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {leaveData.pendingRequests.length > 0 ? (
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <SectionHeader eyebrow="Requests" title="Recent leave requests" />
          </div>

          <div className="space-y-3">
            {leaveData.pendingRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{request.leave_types?.name || 'Unknown'}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Submitted {formatISTDateLong(request.created_at)}</p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(request.status)}</div>
                </div>
                <dl className="mt-4 divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/20 px-3">
                  <DetailRow label="Date range" value={`${formatISTDateShort(request.start_date)} - ${formatISTDateShort(request.end_date)}`} />
                  <DetailRow label="Days" value={`${request.total_days}`} />
                  <DetailRow label="Submitted" value={formatISTDateLong(request.created_at)} />
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
