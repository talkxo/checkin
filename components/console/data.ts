"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdminStats,
  AttendanceReport,
  Birthday,
  ConsoleUser,
  DocumentLink,
  EmployeeProfileData,
  Holiday,
  LeaderboardRow,
  LeaveRequestRow,
  LeaveType,
  TodayRow,
} from "./types";

// ---------------------------------------------------------------------------
// Fetch helpers — every console API call goes through these so error handling,
// JSON parsing, and credentials stay identical across modules.
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (res.status === 401) throw new ApiError("Session expired", 401);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function sendJSON<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new ApiError("Session expired", 401);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

// ---------------------------------------------------------------------------
// The standard console data hook: { data, loading, error, refresh }.
// `path === null` disables fetching (e.g. waiting for a date range).
// ---------------------------------------------------------------------------

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApiData<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback(async () => {
    const current = pathRef.current;
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getJSON<T>(current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [path, refresh]);

  return { data, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Module hooks — one per backing API, typed end to end.
// ---------------------------------------------------------------------------

export function useStats() {
  return useApiData<AdminStats>("/api/admin/stats");
}

export function useToday() {
  return useApiData<{ attendance: TodayRow[] }>("/api/admin/today");
}

export function useUsers() {
  return useApiData<ConsoleUser[]>("/api/admin/users");
}

export function useAttendanceReport(startDate: string | null, endDate: string | null) {
  const path =
    startDate && endDate
      ? `/api/admin/attendance-report?startDate=${startDate}&endDate=${endDate}`
      : null;
  return useApiData<AttendanceReport>(path);
}

export function useLeaveRequests(status: string = "all") {
  return useApiData<{ leaveRequests: LeaveRequestRow[] }>(
    `/api/admin/leave-requests?status=${status}`
  );
}

export function useLeaveTypes() {
  return useApiData<{ leaveTypes: LeaveType[] }>("/api/leave/types");
}

export function useBirthdays() {
  return useApiData<{ birthdays: Birthday[] }>("/api/admin/birthdays");
}

export function useLeaderboard() {
  return useApiData<{ topByStreak: LeaderboardRow[]; topByDeepScore: LeaderboardRow[] }>(
    "/api/admin/leaderboard"
  );
}

export function useEmployeeProfile(id: string | null) {
  return useApiData<EmployeeProfileData>(id ? `/api/admin/employees/${id}` : null);
}

export function useHolidays() {
  return useApiData<{ holidays: Holiday[] }>("/api/admin/holidays");
}


// Free models emit literal "\n" sequences and <br> tags instead of real
// newlines, and GFM tables need every row on its own line — normalize before
// handing AI text to the markdown renderer.
export function normalizeAiMarkdown(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n/g, "\n");
}

// ---------------------------------------------------------------------------
// Mutations — thin typed wrappers over the admin APIs.
// ---------------------------------------------------------------------------

export interface NewUserPayload {
  fullName: string;
  email?: string;
}

export function apiAddUser(payload: NewUserPayload) {
  return sendJSON<ConsoleUser>("/api/admin/users", "POST", payload);
}

export function apiUpdateUser(payload: {
  id: string;
  fullName?: string;
  email?: string;
  active?: boolean;
}) {
  return sendJSON<ConsoleUser>("/api/admin/users", "PUT", payload);
}

export function apiDeactivateUser(id: string) {
  return sendJSON<ConsoleUser>(`/api/admin/users?id=${id}`, "DELETE");
}

export function apiUpdateEmployee(
  id: string,
  payload: Partial<{
    fullName: string;
    dateOfBirth: string;
    phone: string;
    emergencyContact: string;
    active: boolean;
  }>
) {
  return sendJSON<{ employee: unknown }>(`/api/admin/employees/${id}`, "PATCH", payload);
}

export function apiAddDocument(id: string, payload: { label: string; url: string }) {
  return sendJSON<{ document: DocumentLink; reachable: boolean | null }>(
    `/api/admin/employees/${id}`,
    "POST",
    payload
  );
}

export function apiVerifyDocument(id: string, url: string) {
  return sendJSON<{ reachable: boolean }>(`/api/admin/employees/${id}`, "PUT", { url });
}

export function apiDeleteDocument(id: string, documentId: string) {
  return sendJSON<{ success: boolean }>(
    `/api/admin/employees/${id}?documentId=${documentId}`,
    "DELETE"
  );
}

export function apiProcessLeave(
  requestId: string,
  action: "approve" | "reject",
  rejectionReason?: string
) {
  return sendJSON<{ success: boolean; message: string; warning?: string }>(
    "/api/admin/leave-requests/process",
    "POST",
    { requestId, action, adminId: "00000000-0000-0000-0000-000000000000", rejectionReason }
  );
}

export function apiUpdateLeaveBalance(payload: {
  employeeId: string;
  year: number;
  leaveBalances: Record<string, { total_entitlement: number; used_leaves: number; pending_leaves: number }>;
}) {
  return sendJSON<{ success: boolean; message: string }>(
    "/api/admin/update-leave-balance",
    "POST",
    payload
  );
}

export function apiRunAccrual(payload: { month: number; year: number }) {
  return sendJSON<{ message?: string; earnedCount?: number; year?: number }>(
    "/api/leave/accrual",
    "POST",
    payload
  );
}

export function apiAddHoliday(payload: { name: string; date: string }) {
  return sendJSON<{ holiday: Holiday }>("/api/admin/holidays", "POST", payload);
}

export function apiAddHolidays(items: Array<{ name: string; date: string }>) {
  return sendJSON<{ holidays: Holiday[]; added: number; submitted: number }>(
    "/api/admin/holidays",
    "POST",
    { items }
  );
}

export function apiDeleteHoliday(id: string) {
  return sendJSON<{ success: boolean }>(`/api/admin/holidays?id=${id}`, "DELETE");
}

// ---------------------------------------------------------------------------
// AI endpoints (existing /api/ai/* + /api/admin-chat) used by the dashboard
// assistant bento.
// ---------------------------------------------------------------------------

export function apiAiReport(payload: {
  attendanceData: unknown[];
  timeRange: string;
  prompt?: string;
}) {
  return sendJSON<{ report?: string; insights?: string; error?: string }>(
    "/api/ai/report",
    "POST",
    payload
  );
}

export function apiAiInsights(payload: {
  attendanceData: unknown[];
  timeRange: string;
  prompt?: string;
}) {
  return sendJSON<{ insights?: string; report?: string; error?: string }>(
    "/api/ai/insights",
    "POST",
    payload
  );
}

export function apiAiSentiment(payload: { moodData: unknown[]; timeRange: string }) {
  return sendJSON<{ sentiment?: string; error?: string }>("/api/ai/sentiment", "POST", payload);
}

export async function getHistoricalData(
  range: string,
  custom?: { startDate: string; endDate: string }
): Promise<unknown[]> {
  const params = new URLSearchParams({ range });
  if (custom?.startDate && custom?.endDate) {
    params.set("startDate", custom.startDate);
    params.set("endDate", custom.endDate);
  }
  const data = await getJSON<{ attendanceData: unknown[] }>(`/api/admin/historical-data?${params}`);
  return data.attendanceData ?? [];
}

export async function getMoodData(
  range: string,
  custom?: { startDate: string; endDate: string }
): Promise<unknown[]> {
  const params = new URLSearchParams({ range });
  if (custom?.startDate && custom?.endDate) {
    params.set("startDate", custom.startDate);
    params.set("endDate", custom.endDate);
  }
  const data = await getJSON<{ moodData: unknown[] }>(`/api/admin/mood-data?${params}`);
  return data.moodData ?? [];
}

export function apiAdminChat(message: string) {
  return sendJSON<{ response: string }>("/api/admin-chat", "POST", { message });
}
