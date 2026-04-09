"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Brain,
  Calendar,
  Eye,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import DarkModeToggle from "@/components/dark-mode-toggle";
import AdminLeaveManagement from "@/components/admin-leave-management";
import { WorkspaceShell } from "@/components/admin/workspace-shell";
import { AdminOverviewWorkspace } from "@/components/admin/admin-overview-workspace";
import { AdminAttendanceWorkspace } from "@/components/admin/admin-attendance-workspace";
import { AdminPeopleWorkspace } from "@/components/admin/admin-people-workspace";
import { AdminAiWorkspace } from "@/components/admin/admin-ai-workspace";
import { EmployeeDetailDrawer } from "@/components/admin/employee-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBanner } from "@/components/ui/status-banner";
import { formatISTDateKey, formatISTDateLong, formatISTTimeShort } from "@/lib/time";
import type {
  AdminStats,
  AdminTab,
  AttendanceDateRange,
  EmployeeSummary,
  TeamSummary,
  TodayData,
  User,
} from "@/components/admin/types";

export const dynamic = "force-dynamic";

const ADMIN_LATE_CUTOFF_MINUTES = 630;

type AttendanceStatusFilter = "all" | "active" | "attention" | "missing";
type AttendanceModeFilter = "all" | "office" | "remote";
type AiFeature = "insights" | "report" | "sentiment";
type AiRange = "today" | "week" | "month";

interface NoticeState {
  variant: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
}

const DEFAULT_ATTENDANCE_RANGE: AttendanceDateRange = {
  startDate: "",
  endDate: "",
  preset: "currentMonth",
};

const defaultEditForm = { fullName: "", email: "", active: true };

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [todayData, setTodayData] = useState<TodayData[]>([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [dateRange, setDateRange] = useState<AttendanceDateRange>(DEFAULT_ATTENDANCE_RANGE);
  const [attendanceData, setAttendanceData] = useState<EmployeeSummary[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  const [peopleSearchQuery, setPeopleSearchQuery] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<AttendanceStatusFilter>("all");
  const [attendanceModeFilter, setAttendanceModeFilter] = useState<AttendanceModeFilter>("all");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "attendanceRate",
    direction: "desc",
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(5);
  const [isResetting, setIsResetting] = useState(false);

  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({ fullName: "", email: "" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState(defaultEditForm);

  const [aiTimeRange, setAiTimeRange] = useState<AiRange>("week");
  const [selectedAiFeature, setSelectedAiFeature] = useState<AiFeature>("insights");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  useEffect(() => {
    const now = new Date();
    const todayKey = formatISTDateKey(now);
    const [year, month] = todayKey.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = todayKey;
    setDateRange((prev) => ({
      startDate: prev.startDate || startDate,
      endDate: prev.endDate || endDate,
      preset: prev.preset || "currentMonth",
    }));
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab") as AdminTab | null;
    const status = searchParams.get("status") as AttendanceStatusFilter | null;
    const mode = searchParams.get("mode") as AttendanceModeFilter | null;
    const search = searchParams.get("q");
    const peopleSearch = searchParams.get("people_q");
    const sortKey = searchParams.get("sort");
    const direction = searchParams.get("dir") as "asc" | "desc" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const preset = searchParams.get("preset");

    if (tab) setActiveTab(tab);
    if (status) setAttendanceStatusFilter(status);
    if (mode) setAttendanceModeFilter(mode);
    if (search) setAttendanceSearchQuery(search);
    if (peopleSearch) setPeopleSearchQuery(peopleSearch);
    if (sortKey && direction) setSortConfig({ key: sortKey, direction });
    if (startDate && endDate) {
      setDateRange({
        startDate,
        endDate,
        preset: preset || "custom",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    params.set("tab", activeTab);
    params.set("status", attendanceStatusFilter);
    params.set("mode", attendanceModeFilter);
    params.set("sort", sortConfig.key);
    params.set("dir", sortConfig.direction);
    params.set("preset", dateRange.preset);
    if (attendanceSearchQuery) params.set("q", attendanceSearchQuery);
    else params.delete("q");
    if (peopleSearchQuery) params.set("people_q", peopleSearchQuery);
    else params.delete("people_q");
    if (dateRange.startDate) params.set("startDate", dateRange.startDate);
    if (dateRange.endDate) params.set("endDate", dateRange.endDate);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  }, [
    activeTab,
    attendanceModeFilter,
    attendanceSearchQuery,
    attendanceStatusFilter,
    dateRange.endDate,
    dateRange.preset,
    dateRange.startDate,
    peopleSearchQuery,
    router,
    sortConfig.direction,
    sortConfig.key,
  ]);

  useEffect(() => {
    refreshOverview();
  }, []);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      loadAttendanceData();
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (showResetDialog && resetCountdown > 0) {
      const timer = window.setTimeout(() => setResetCountdown((prev) => prev - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [showResetDialog, resetCountdown]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return "just now";
    return `${formatISTDateLong(lastUpdatedAt)} at ${formatISTTimeShort(lastUpdatedAt)}`;
  }, [lastUpdatedAt]);

  const refreshOverview = async () => {
    setIsRefreshing(true);
    try {
      const [statsResponse, todayResponse, usersResponse, leaveResponse] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/today"),
        fetch("/api/admin/users"),
        fetch("/api/admin/leave-requests?status=pending"),
      ]);

      if (statsResponse.ok) setStats(await statsResponse.json());
      if (todayResponse.ok) {
        const data = await todayResponse.json();
        setTodayData(data.attendance || []);
      }
      if (usersResponse.ok) setAllUsers(await usersResponse.json());
      if (leaveResponse.ok) {
        const data = await leaveResponse.json();
        setPendingLeaveCount((data.leaveRequests || []).length);
      }
      setLastUpdatedAt(new Date());
    } catch (error) {
      setNotice({ variant: "error", title: "Refresh failed", message: "Admin data could not be refreshed. Please try again." });
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;

    setIsLoadingAttendance(true);
    try {
      const response = await fetch(`/api/admin/attendance-report?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!response.ok) throw new Error("Failed to load attendance");
      const data = await response.json();
      setAttendanceData(data.employeeSummaries || []);
      setTeamSummary(data.teamSummary || null);
      setLastUpdatedAt(new Date());
    } catch {
      setNotice({ variant: "error", title: "Attendance unavailable", message: "The attendance report could not be loaded for this range." });
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const handleDateRangePresetChange = (preset: string) => {
    const now = new Date();
    const todayKey = formatISTDateKey(now);
    const [year, month] = todayKey.split("-").map(Number);
    let startDate = "";
    let endDate = "";

    switch (preset) {
      case "currentMonth":
        startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        endDate = todayKey;
        break;
      case "previousMonth":
        startDate = formatISTDateKey(new Date(year, month - 2, 1));
        endDate = formatISTDateKey(new Date(year, month - 1, 0));
        break;
      case "last7Days":
        startDate = formatISTDateKey(new Date(now.getTime() - 7 * 86400000));
        endDate = todayKey;
        break;
      case "last30Days":
        startDate = formatISTDateKey(new Date(now.getTime() - 30 * 86400000));
        endDate = todayKey;
        break;
      default:
        return;
    }

    setDateRange({ startDate, endDate, preset });
  };

  const handleCustomDateChange = (field: "startDate" | "endDate", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value, preset: "custom" }));
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAttendance = useMemo(() => {
    const lateCutoff = ADMIN_LATE_CUTOFF_MINUTES;

    const filtered = attendanceData.filter((employee) => {
      const matchesSearch = employee.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase());
      const matchesMode =
        attendanceModeFilter === "all" ||
        (attendanceModeFilter === "office" && employee.officeDays > 0) ||
        (attendanceModeFilter === "remote" && employee.remoteDays > 0);

      const hasActiveSession = employee.sessions.some((session) => session.status === "Active");
      const hasLateSession = employee.sessions.some((session) => {
        const [hour, minute] = session.checkinTime.split(":").map(Number);
        return !Number.isNaN(hour) && hour * 60 + minute >= lateCutoff;
      });
      const needsAttendanceAttention =
        employee.elapsedWorkingDays >= 3
          ? employee.missedDays >= 2 || employee.attendanceRate < 75
          : employee.missedDays >= 1;
      const matchesStatus =
        attendanceStatusFilter === "all" ||
        (attendanceStatusFilter === "active" && hasActiveSession) ||
        (attendanceStatusFilter === "attention" && (hasLateSession || needsAttendanceAttention)) ||
        (attendanceStatusFilter === "missing" && employee.daysPresent === 0 && employee.missedDays > 0);

      return matchesSearch && matchesMode && matchesStatus;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof EmployeeSummary];
      const bValue = b[sortConfig.key as keyof EmployeeSummary];
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

    return filtered;
  }, [attendanceData, attendanceModeFilter, attendanceSearchQuery, attendanceStatusFilter, sortConfig.direction, sortConfig.key]);

  const handleOpenEmployee = (employee: EmployeeSummary) => {
    setSelectedEmployee(employee);
    setIsEmployeeDrawerOpen(true);
  };

  const handleExportFilteredAttendance = () => {
    if (!filteredAttendance.length) return;
    const headers = ["Employee Name", "Attendance Rate", "Days Present", "Average Hours / Day", "Office Days", "Remote Days"];
    const csvContent = [
      headers.join(","),
      ...filteredAttendance.map((employee) =>
        [
          `"${employee.name}"`,
          employee.attendanceRate,
          employee.daysPresent,
          employee.averageHoursPerDay,
          employee.officeDays,
          employee.remoteDays,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `attendance-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleOpenAttendanceFromOverview = (filters?: {
    status?: AttendanceStatusFilter;
    mode?: AttendanceModeFilter;
  }) => {
    setActiveTab("attendance");
    if (filters?.status) setAttendanceStatusFilter(filters.status);
    if (filters?.mode) setAttendanceModeFilter(filters.mode);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.push("/admin/login");
    } catch {
      setNotice({ variant: "error", title: "Logout failed", message: "The admin session could not be ended cleanly." });
    }
  };

  const handleResetSessions = async () => {
    if (resetCountdown > 0) return;
    setIsResetting(true);
    try {
      const response = await fetch("/api/admin/reset-sessions", { method: "POST" });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Failed to reset sessions");
      setShowResetDialog(false);
      setResetCountdown(5);
      setNotice({ variant: "success", title: "Sessions reset", message: data.message || "All active sessions were checked out." });
      await refreshOverview();
      await loadAttendanceData();
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Reset failed",
        message: error instanceof Error ? error.message : "The session reset did not complete.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add user");
      setShowAddUserDialog(false);
      setNewUserData({ fullName: "", email: "" });
      setNotice({ variant: "success", title: "User added", message: `${data.full_name} is now available in the roster.` });
      await refreshOverview();
    } catch (error) {
      setNotice({ variant: "error", title: "User add failed", message: error instanceof Error ? error.message : "Could not add user." });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingUser.id, ...editUserData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update user");
      setShowEditUserDialog(false);
      setEditingUser(null);
      setEditUserData(defaultEditForm);
      setNotice({ variant: "success", title: "User updated", message: `${data.full_name} has been updated.` });
      await refreshOverview();
    } catch (error) {
      setNotice({ variant: "error", title: "Update failed", message: error instanceof Error ? error.message : "Could not update user." });
    }
  };

  const confirmDeactivateUser = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to deactivate user");
      setNotice({ variant: "success", title: "User deactivated", message: `${data.full_name} is now inactive.` });
      await refreshOverview();
    } catch (error) {
      setNotice({ variant: "error", title: "Deactivation failed", message: error instanceof Error ? error.message : "Could not deactivate user." });
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      fullName: user.full_name,
      email: user.email || "",
      active: user.active,
    });
    setShowEditUserDialog(true);
  };

  const loadHistoricalData = async (range: AiRange) => {
    const response = await fetch(`/api/admin/historical-data?range=${range}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.attendanceData || [];
  };

  const loadMoodData = async (range: AiRange) => {
    const response = await fetch(`/api/admin/mood-data?range=${range}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.moodData || [];
  };

  const generateAiOutput = async () => {
    setIsAiLoading(true);
    try {
      if (selectedAiFeature === "sentiment") {
        const moodData = await loadMoodData(aiTimeRange);
        const response = await fetch("/api/ai/sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moodData,
            timeRange: aiTimeRange === "today" ? "Today" : aiTimeRange === "week" ? "This Week" : "This Month",
          }),
        });
        const data = await response.json();
        setAiResult(data.sentiment || "No sentiment analysis returned.");
      } else {
        const attendancePayload = aiTimeRange === "today" ? todayData : await loadHistoricalData(aiTimeRange);
        const endpoint = selectedAiFeature === "report" ? "/api/ai/report" : "/api/ai/insights";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendanceData: attendancePayload,
            timeRange: aiTimeRange === "today" ? "Today" : aiTimeRange === "week" ? "This Week" : "This Month",
            prompt: customPrompt || undefined,
          }),
        });
        const data = await response.json();
        setAiResult(data.report || data.insights || "No analysis returned.");
      }
    } catch {
      setAiResult("The AI workspace could not generate an answer. Please retry with a narrower scope.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Eye },
    { id: "attendance" as const, label: "Attendance", icon: ShieldCheck },
    { id: "people" as const, label: "People", icon: Users, count: allUsers.length },
    { id: "ai" as const, label: "Assistive AI", icon: Brain },
    { id: "leave" as const, label: "Leave & Exceptions", icon: Calendar, count: pendingLeaveCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <WorkspaceShell
          title="Operational Workspace"
          subtitle="Operate attendance, people, and leave with clearer prioritization and fewer dead ends."
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => router.push("/admin-chat")} className="rounded-xl">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat Mode
              </Button>
              <Button variant="outline" size="sm" onClick={refreshOverview} className="rounded-xl">
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <DarkModeToggle />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-muted-foreground hover:text-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          }
        >
          {notice ? (
            <StatusBanner
              variant={notice.variant}
              title={notice.title}
              message={notice.message}
              className="mb-6"
            />
          ) : null}

          {activeTab === "overview" ? (
            <AdminOverviewWorkspace
              stats={stats}
              todayData={todayData}
              pendingLeaveCount={pendingLeaveCount}
              lastUpdatedLabel={lastUpdatedLabel}
              loading={isRefreshing}
              onRefresh={refreshOverview}
              onOpenAttendance={handleOpenAttendanceFromOverview}
              onOpenLeave={() => setActiveTab("leave")}
            />
          ) : null}

          {activeTab === "attendance" ? (
            <AdminAttendanceWorkspace
              teamSummary={teamSummary}
              employees={attendanceData}
              filteredEmployees={filteredAttendance}
              loading={isLoadingAttendance}
              searchQuery={attendanceSearchQuery}
              onSearchQueryChange={setAttendanceSearchQuery}
              statusFilter={attendanceStatusFilter}
              onStatusFilterChange={setAttendanceStatusFilter}
              modeFilter={attendanceModeFilter}
              onModeFilterChange={setAttendanceModeFilter}
              dateRange={dateRange}
              onDateRangePresetChange={handleDateRangePresetChange}
              onDateChange={handleCustomDateChange}
              sortConfig={sortConfig}
              onSort={handleSort}
              onRefresh={loadAttendanceData}
              onExport={handleExportFilteredAttendance}
              onOpenEmployee={handleOpenEmployee}
              lastUpdatedLabel={lastUpdatedLabel}
            />
          ) : null}

          {activeTab === "people" ? (
            <AdminPeopleWorkspace
              users={allUsers}
              searchQuery={peopleSearchQuery}
              onSearchQueryChange={setPeopleSearchQuery}
              onAddUser={() => setShowAddUserDialog(true)}
              onEditUser={openEditDialog}
              onDeactivateUser={confirmDeactivateUser}
            />
          ) : null}

          {activeTab === "ai" ? (
            <AdminAiWorkspace
              aiTimeRange={aiTimeRange}
              selectedAiFeature={selectedAiFeature}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
              onAiTimeRangeChange={setAiTimeRange}
              onSelectedAiFeatureChange={setSelectedAiFeature}
              onGenerate={generateAiOutput}
              isLoading={isAiLoading}
              result={aiResult}
            />
          ) : null}

          {activeTab === "leave" ? (
            <div className="space-y-4">
              <StatusBanner
                variant={pendingLeaveCount > 0 ? "warning" : "info"}
                title="Leave & Exceptions"
                message={
                  pendingLeaveCount > 0
                    ? `${pendingLeaveCount} pending leave request${pendingLeaveCount > 1 ? "s" : ""} need attention. Session reset is available in the guarded action below.`
                    : "No pending leave requests right now. Use this workspace to review balances and exceptions."
                }
                action={
                  <Button variant="outline" onClick={() => { setShowResetDialog(true); setResetCountdown(5); }} className="rounded-xl">
                    Reset Sessions
                  </Button>
                }
              />
              <AdminLeaveManagement />
            </div>
          ) : null}
        </WorkspaceShell>
      </div>

      <EmployeeDetailDrawer employee={selectedEmployee} open={isEmployeeDrawerOpen} onOpenChange={setIsEmployeeDrawerOpen} />

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="rounded-3xl border-border/60">
          <DialogHeader>
            <DialogTitle>Reset Active Sessions</DialogTitle>
            <DialogDescription>
              This checks out every currently active session. Use it only for exception handling.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
            Confirmation unlocks in {resetCountdown} second{resetCountdown !== 1 ? "s" : ""}.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleResetSessions} disabled={resetCountdown > 0 || isResetting}>
              {isResetting ? "Resetting…" : resetCountdown > 0 ? `Confirm (${resetCountdown}s)` : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="rounded-3xl border-border/60">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new employee record for attendance and leave tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input
                value={newUserData.fullName}
                onChange={(event) => setNewUserData((prev) => ({ ...prev, fullName: event.target.value }))}
                className="mt-2 rounded-xl border-border/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={newUserData.email}
                onChange={(event) => setNewUserData((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-2 rounded-xl border-border/60"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={!newUserData.fullName.trim()}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="rounded-3xl border-border/60">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update basic user details and active state.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input
                value={editUserData.fullName}
                onChange={(event) => setEditUserData((prev) => ({ ...prev, fullName: event.target.value }))}
                className="mt-2 rounded-xl border-border/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={editUserData.email}
                onChange={(event) => setEditUserData((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-2 rounded-xl border-border/60"
              />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border/60 px-4 py-3">
              <input
                type="checkbox"
                checked={editUserData.active}
                onChange={(event) => setEditUserData((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Active User</span>
            </label>
          </div>
          <DialogFooter>
            {editingUser?.active ? (
              <Button variant="outline" className="mr-auto text-destructive" onClick={() => editingUser && confirmDeactivateUser(editingUser)}>
                Deactivate
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={!editUserData.fullName.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
