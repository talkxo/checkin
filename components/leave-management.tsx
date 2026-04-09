'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Briefcase, Calendar, CalendarDays, CheckCircle, ChevronDown, ChevronUp, Clock, HeartPulse, PartyPopper, Plus, Umbrella, X, XCircle } from 'lucide-react';
import { formatISTDateShort } from '@/lib/time';
import type { LeaveBalanceResponse, LeaveRequestFormData, LeaveType } from '@/types/leave';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground [font-variant-numeric:tabular-nums]">{value}</dd>
    </div>
  );
}

function toInputDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLeaveTypeMeta(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes('bonus')) {
    return { icon: PartyPopper, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' };
  }

  if (normalized.includes('sick')) {
    return { icon: HeartPulse, tint: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
  }

  if (normalized.includes('casual')) {
    return { icon: Umbrella, tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
  }

  return { icon: Briefcase, tint: 'bg-primary/10 text-primary border-primary/25' };
}

function getShortLeaveTypeLabel(name: string) {
  return name.replace(/\s*leave\s*/gi, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeLeaveTypeName(name: string) {
  return name.trim().toLowerCase();
}

interface LeaveManagementProps {
  employeeSlug?: string;
  employeeEmail?: string;
}

function ScratchGetWellBanner({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGifLoading, setIsGifLoading] = useState(false);

  const loadGif = async () => {
    setIsGifLoading(true);
    try {
      const response = await fetch('/api/giphy/get-well');
      if (!response.ok) {
        setGifUrl(null);
        return;
      }
      const data = await response.json();
      setGifUrl(data?.gifUrl || null);
    } catch {
      setGifUrl(null);
    } finally {
      setIsGifLoading(false);
    }
  };

  useEffect(() => {
    loadGif();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(220, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height || rect.width));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const scratchGradient = ctx.createLinearGradient(0, 0, width, height);
    scratchGradient.addColorStop(0, '#6ee7b7'); // brighter mint
    scratchGradient.addColorStop(0.48, '#67e8f9'); // bright aqua
    scratchGradient.addColorStop(1, '#38bdf8'); // vivid sky blue
    ctx.fillStyle = scratchGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(15,23,42,0.72)';
    ctx.font = '700 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch here', width / 2, height / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeText('Scratch here', width / 2, height / 2);
    ctx.globalCompositeOperation = 'destination-out';

    let drawing = false;
    const scratchAt = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
    };

    const getLocalCoords = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      drawing = true;
      const p = getLocalCoords(e.clientX, e.clientY);
      scratchAt(p.x, p.y);
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing) return;
      const p = getLocalCoords(e.clientX, e.clientY);
      scratchAt(p.x, p.y);
    };
    const onUp = () => {
      drawing = false;
      const sample = ctx.getImageData(0, 0, width, height).data;
      let transparent = 0;
      for (let i = 3; i < sample.length; i += 4) {
        if (sample[i] < 20) transparent++;
      }
      const ratio = transparent / (sample.length / 4);
      if (ratio > 0.42) {
        setRevealed(true);
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/15 via-primary/15 to-cyan-500/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
      <div className="absolute right-3 top-3 z-30">
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss get well banner"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative aspect-square w-full overflow-hidden"
        onClick={() => {
          if (revealed && !isGifLoading) {
            loadGif();
          }
        }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center">
          {gifUrl && !isGifLoading ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gifUrl} alt="Get well soon gif" className="h-full w-full object-cover" />
          ) : (
            <p className="text-sm font-medium text-foreground">Loading a get well soon surprise...</p>
          )}
        </div>
        {!revealed ? <canvas ref={canvasRef} className="relative z-10 touch-none" /> : null}
      </div>
    </div>
  );
}

export default function LeaveManagement({ employeeSlug, employeeEmail }: LeaveManagementProps) {
  const [leaveData, setLeaveData] = useState<LeaveBalanceResponse | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestStep, setRequestStep] = useState<1 | 2>(1);
  const [requestForm, setRequestForm] = useState<LeaveRequestFormData>({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSickScratchBanner, setShowSickScratchBanner] = useState(false);
  const [isBalanceExpanded, setIsBalanceExpanded] = useState(false);
  const [isAccrualExpanded, setIsAccrualExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  const fetchLeaveData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

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
      setLoadError(err instanceof Error ? err.message : 'Failed to load leave data');
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

  const fetchLeaveHistory = async () => {
    if (!employeeSlug && !employeeEmail) return;
    try {
      setIsHistoryLoading(true);
      const params = new URLSearchParams();
      if (employeeSlug) params.append('slug', employeeSlug);
      if (employeeEmail) params.append('email', employeeEmail);
      params.append('status', 'all');

      const response = await fetch(`/api/leave/request?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leave history');
      }
      setLeaveHistory(data.leaveRequests || []);
    } catch (err) {
      console.error('Error fetching leave history:', err);
      setLeaveHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const cancelLeaveRequest = async (requestId: string) => {
    if (!requestId) return;
    if (!confirm('Cancel this leave request?')) return;

    try {
      setCancellingRequestId(requestId);
      setFormError(null);
      setSuccess(null);

      const response = await fetch('/api/leave/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          ...(employeeSlug ? { slug: employeeSlug } : {}),
          ...(employeeEmail ? { email: employeeEmail } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to cancel leave request');

      setSuccess('Leave request cancelled.');
      await Promise.all([fetchLeaveData(), fetchLeaveHistory()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to cancel leave request');
    } finally {
      setCancellingRequestId(null);
    }
  };

  const submitLeaveRequest = async (formOverride?: LeaveRequestFormData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      setSuccess(null);
      const effectiveForm = formOverride ?? requestForm;

      if (!effectiveForm.leaveTypeId || !effectiveForm.startDate || !effectiveForm.endDate) {
        setFormError('Please choose a leave type, start date and end date.');
        return;
      }

      const start = new Date(effectiveForm.startDate);
      const end = new Date(effectiveForm.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        setFormError('Please select a valid date range.');
        return;
      }

      const selectedType = leaveTypes.find((type) => type.id === effectiveForm.leaveTypeId);
      const selectedBalance = leaveData?.leaveBalance.find(
        (balance) => balance.leave_type_name.toLowerCase() === (selectedType?.name || '').toLowerCase(),
      );
      const requestedDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      if ((selectedBalance?.available_leaves ?? 0) < requestedDays) {
        setFormError(
          `Insufficient ${selectedType?.name || 'leave'} balance. Requested ${requestedDays} day(s), available ${
            selectedBalance?.available_leaves ?? 0
          }.`,
        );
        return;
      }

      const requestBody = {
        ...effectiveForm,
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
        if (response.status === 409) {
          throw new Error('A request for this leave type already exists for the selected date(s).');
        }
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setSuccess('Leave request submitted successfully!');
      if ((selectedType?.name || '').toLowerCase().includes('sick')) {
        setShowSickScratchBanner(true);
      }
      setShowRequestDialog(false);
      setRequestStep(1);
      setRequestForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      await Promise.all([fetchLeaveData(), fetchLeaveHistory()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit request');
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
    fetchLeaveHistory();
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

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-3xl border-destructive/50 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 text-destructive">
              <AlertCircle className="mt-0.5 h-6 w-6" />
              <div>
                <h3 className="font-semibold">Error Loading Leave Data</h3>
                <p className="mt-1 text-sm">{loadError}</p>
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

  const leaveBalanceByType = new Map(
    leaveData.leaveBalance.map((balance) => [normalizeLeaveTypeName(balance.leave_type_name), balance.available_leaves]),
  );
  const sickLeaveType = leaveTypes.find((type) => type.name.toLowerCase().includes('sick'));
  const sickLeaveAvailable = sickLeaveType ? leaveBalanceByType.get(normalizeLeaveTypeName(sickLeaveType.name)) ?? 0 : 0;
  const totalUsedLeaves = leaveData.leaveBalance.reduce((sum, item) => sum + Number(item.used_leaves || 0), 0);
  const totalBonusLeaves = leaveData.accrualHistory.reduce((sum, item) => sum + Number(item.accrued_leaves || 0), 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateLabel = formatISTDateShort(toInputDateValue(tomorrow));
  const handleDialogOpenChange = (open: boolean) => {
    setShowRequestDialog(open);
    if (open) {
      setFormError(null);
      setSuccess(null);
    }
    if (!open) {
      setRequestStep(1);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {showSickScratchBanner ? (
        <div className="mb-4">
          <ScratchGetWellBanner onClose={() => setShowSickScratchBanner(false)} />
        </div>
      ) : null}

      <Dialog open={showRequestDialog} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary">
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="main-typography left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center overflow-y-auto rounded-none border-0 bg-background px-4 py-5 sm:px-6 sm:py-6">
              <div className="mx-auto w-full max-w-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground">Request Leave</DialogTitle>
              </DialogHeader>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold leading-none text-foreground">Quick apply</p>
                  </div>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                    <HeartPulse className="h-4 w-4 text-red-500 dark:text-red-400" />
                  </span>
                </div>
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  disabled={isSubmitting || !sickLeaveType || sickLeaveAvailable <= 0}
                  onClick={() => {
                    if (!sickLeaveType) return;
                    const tomorrowDate = toInputDateValue(tomorrow);
                    submitLeaveRequest({
                      leaveTypeId: sickLeaveType.id,
                      startDate: tomorrowDate,
                      endDate: tomorrowDate,
                      reason: 'Sick leave',
                    });
                  }}
                >
                  {sickLeaveType
                    ? sickLeaveAvailable > 0
                      ? `🤒 Sick, can't make it tomorrow (${tomorrowDateLabel})`
                      : 'Sick Leave unavailable (0 left)'
                    : 'Sick leave type unavailable'}
                </Button>
              </div>

              <div className="border-t border-border/70 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Or fill details</p>
              </div>

              {requestStep === 1 ? (
                <div className="grid gap-3 py-1 sm:gap-4 sm:py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="leaveType" className="text-sm font-medium text-foreground">Leave Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {leaveTypes.map((type) => {
                        const selected = requestForm.leaveTypeId === type.id;
                        const meta = getLeaveTypeMeta(type.name);
                        const Icon = meta.icon;
                        const shortLabel = getShortLeaveTypeLabel(type.name) || type.name;
                        const available = leaveBalanceByType.get(normalizeLeaveTypeName(type.name)) ?? 0;
                        const isDisabled = available <= 0;

                        return (
                          <button
                            key={type.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (isDisabled) return;
                              setFormError(null);
                              setRequestForm({ ...requestForm, leaveTypeId: type.id });
                            }}
                            className={`flex h-11 items-center justify-start gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                              selected
                                ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                                : isDisabled
                                  ? 'border-border/60 bg-background/60 text-muted-foreground opacity-60'
                                  : 'border-border/70 bg-background text-foreground hover:border-primary/40 hover:bg-muted/50'
                            }`}
                          >
                            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${meta.tint}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-xs font-medium leading-none">{shortLabel}</span>
                              <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">({available})</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate" className="text-sm font-medium text-foreground">Start Date</Label>
                      <div className="relative">
                        <Input
                          id="startDate"
                          type="date"
                          className="h-11 border-input pr-10 text-left leading-none focus:border-primary focus:ring-primary [&::-webkit-calendar-picker-indicator]:opacity-0"
                          value={requestForm.startDate}
                          onChange={(e) => {
                            setFormError(null);
                            setRequestForm({ ...requestForm, startDate: e.target.value });
                          }}
                        />
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate" className="text-sm font-medium text-foreground">End Date</Label>
                      <div className="relative">
                        <Input
                          id="endDate"
                          type="date"
                          className="h-11 border-input pr-10 text-left leading-none focus:border-primary focus:ring-primary [&::-webkit-calendar-picker-indicator]:opacity-0"
                          value={requestForm.endDate}
                          onChange={(e) => {
                            setFormError(null);
                            setRequestForm({ ...requestForm, endDate: e.target.value });
                          }}
                        />
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setFormError(null);
                        setRequestStep(2);
                      }}
                    disabled={!requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate}
                  >
                    Continue
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 py-1 sm:gap-4 sm:py-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Start</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{requestForm.startDate || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">End</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{requestForm.endDate || '-'}</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="reason" className="text-sm font-medium text-foreground">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      className="min-h-[84px] resize-none border-input focus:border-primary focus:ring-primary"
                      value={requestForm.reason}
                      onChange={(e) => {
                        setFormError(null);
                        setRequestForm({ ...requestForm, reason: e.target.value });
                      }}
                      placeholder="Brief reason for leave..."
                    />
                  </div>
                </div>
              )}

              {formError ? <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div> : null}
              {success ? <div className="rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm text-foreground">{success}</div> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-3 sm:flex-row sm:justify-end">
                {requestStep === 2 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormError(null);
                        setRequestStep(1);
                      }}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      Back
                    </Button>
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => submitLeaveRequest()}
                      disabled={isSubmitting || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setShowRequestDialog(false)} className="border-border text-foreground hover:bg-muted">
                    Cancel
                  </Button>
                )}
              </div>
              </div>
            </DialogContent>
          </Dialog>

      {success ? (
        <div className="space-y-2">
          {success ? <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground">{success}</div> : null}
        </div>
      ) : null}

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Balance</p>
            <button
              type="button"
              onClick={() => setIsBalanceExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={isBalanceExpanded}
            >
              {isBalanceExpanded ? 'Hide details' : 'Show details'}
              {isBalanceExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {leaveData.leaveBalance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No balance records available yet.</p>
          ) : isBalanceExpanded ? (
            <div className="space-y-4">
              {leaveData.leaveBalance.map((balance) => {
                const progress = balance.total_entitlement > 0 ? Math.min((balance.available_leaves / balance.total_entitlement) * 100, 100) : 0;

                return (
                  <article key={balance.leave_type_name} className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-tight text-foreground">{balance.leave_type_name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {balance.used_leaves} used and {balance.pending_leaves} pending
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Available</p>
                          <p className="mt-1 text-2xl font-semibold leading-none text-foreground [font-variant-numeric:tabular-nums]">
                            {balance.available_leaves}
                          </p>
                        </div>
                      </div>

                      <dl className="space-y-1">
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
          ) : (
            <p className="text-sm text-muted-foreground">
              So far, you have used <span className="font-medium text-foreground">{totalUsedLeaves}</span> leave
              {totalUsedLeaves === 1 ? '' : 's'} and have <span className="font-medium text-foreground">{getTotalAvailableLeaves()}</span>{' '}
              leave{getTotalAvailableLeaves() === 1 ? '' : 's'} available with you. You also got{' '}
              <span className="font-medium text-foreground">{totalBonusLeaves}</span> bonus leave{totalBonusLeaves === 1 ? '' : 's'}.
            </p>
          )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">History</p>
          <button
            type="button"
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={isHistoryExpanded}
          >
            {isHistoryExpanded ? 'Hide details' : 'Show details'}
            {isHistoryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {isHistoryLoading ? (
          <p className="text-sm text-muted-foreground">Loading leave history...</p>
        ) : leaveHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests yet.</p>
        ) : !isHistoryExpanded ? (
          (() => {
            const request = leaveHistory[0];
            const canCancel = request.status === 'pending';
            const meta = getLeaveTypeMeta(request.leave_types?.name || '');
            const Icon = meta.icon;
            return (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/50 px-2.5 py-2">
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${meta.tint}`}
                  title={request.leave_types?.name || 'Unknown'}
                  aria-label={request.leave_types?.name || 'Unknown'}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <p className="min-w-0 flex-1 text-[11px] leading-tight text-foreground">
                  {formatISTDateShort(request.start_date)} - {formatISTDateShort(request.end_date)} ({request.total_days}d)
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {getStatusBadge(request.status)}
                  {canCancel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelLeaveRequest(request.id)}
                      disabled={cancellingRequestId === request.id}
                      className="h-6 rounded-md px-2 text-[10px]"
                    >
                      {cancellingRequestId === request.id ? '...' : 'Cancel'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="space-y-2">
            {leaveHistory.map((request) => {
              const canCancel = request.status === 'pending';
              const meta = getLeaveTypeMeta(request.leave_types?.name || '');
              const Icon = meta.icon;
              return (
                <div key={request.id} className="flex items-center gap-2.5 rounded-xl border border-border/50 px-2.5 py-2">
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${meta.tint}`}
                    title={request.leave_types?.name || 'Unknown'}
                    aria-label={request.leave_types?.name || 'Unknown'}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-tight text-foreground">
                      {formatISTDateShort(request.start_date)} - {formatISTDateShort(request.end_date)} ({request.total_days}d)
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Requested {formatISTDateShort(request.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {getStatusBadge(request.status)}
                    {canCancel ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelLeaveRequest(request.id)}
                        disabled={cancellingRequestId === request.id}
                        className="h-6 rounded-md px-2 text-[10px]"
                      >
                        {cancellingRequestId === request.id ? '...' : 'Cancel'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Accrual</p>
            <button
              type="button"
              onClick={() => setIsAccrualExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={isAccrualExpanded}
            >
              {isAccrualExpanded ? 'Hide details' : 'Show details'}
              {isAccrualExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {leaveData.accrualHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accrual history available yet.</p>
          ) : isAccrualExpanded ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">Accrual history is hidden. Expand to view bonus accrual details.</p>
          )}
      </section>
    </div>
  );
}
