"use client";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminLeaveManagement from '@/components/admin-leave-management';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { AlertTriangle, Clock, Users, TrendingUp, LogOut, Download, FileSpreadsheet, UserPlus, Edit, Trash2, Eye, Brain, Lightbulb, MessageSquare, BarChart3, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface AdminStats {
  totalEmployees: number;
  activeToday: number;
  officeCount: number;
  remoteCount: number;
  averageHours: number;
}

interface UserStats {
  id: string;
  full_name: string;
  totalHours: number;
  officeHours: number;
  remoteHours: number;
  daysPresent: number;
  officeDays: number;
  remoteDays: number;
}

interface TodayData {
  name: string;
  firstIn: string;
  lastOut: string;
  totalHours: string;
  mode: string;
  status: string;
  sessions: number;
}

interface User {
  id: string;
  full_name: string;
  email: string | null;
  slug: string;
  active: boolean;
  created_at: string;
}

interface AttendanceDateRange {
  startDate: string;
  endDate: string;
  preset: string;
}

interface EmployeeSummary {
  employee_id: string;
  name: string;
  slug: string;
  daysPresent: number;
  officeDays: number;
  remoteDays: number;
  totalHours: number;
  officeHours: number;
  remoteHours: number;
  averageHoursPerDay: number;
  attendanceRate: number;
  sessions: Array<{
    id: string;
    date: string;
    checkinTime: string;
    checkoutTime: string;
    hoursWorked: string;
    mode: string;
    status: string;
    mood?: string;
    moodComment?: string;
  }>;
}

interface TeamSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  totalHours: number;
  averageAttendanceRate: number;
  officePercentage: number;
  remotePercentage: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'fortnight' | 'month' | '6months' | 'year'>('week');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [todayData, setTodayData] = useState<TodayData[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'ai' | 'leave'>('dashboard');
  
  // Session reset states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(5);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // Attendance tracker states
  const [dateRange, setDateRange] = useState<AttendanceDateRange>({
    startDate: '',
    endDate: '',
    preset: 'currentMonth'
  });
  const [attendanceData, setAttendanceData] = useState<EmployeeSummary[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Load data on component mount (authentication is handled by layout)
  useEffect(() => {
    loadStats();
    loadUserStats();
    loadChartData();
    loadTodayData();
    loadAllUsers();
  }, [timeRange]);

  // Initialize attendance tracker with current month
  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateRange({ startDate, endDate, preset: 'currentMonth' });
  }, []);

  // Load attendance data when date range changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      loadAttendanceData();
    }
  }, [dateRange]);

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/admin/stats?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch(`/api/admin/user-stats?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadChartData = async () => {
    try {
      const response = await fetch(`/api/admin/daily-stats?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadTodayData = async () => {
    try {
      const response = await fetch('/api/today/summary');
      if (response.ok) {
        const data = await response.json();
        // Transform data to match TodayData interface
        const transformedData = data.map((emp: any) => ({
          name: emp.full_name,
          firstIn: emp.lastIn || 'N/A',
          lastOut: emp.lastOut || 'N/A',
          totalHours: emp.workedHours,
          mode: emp.mode || 'N/A',
          status: emp.open ? 'Active' : (emp.lastIn ? 'Complete' : 'Not Started'),
          sessions: emp.open ? 1 : 0 // Simplified session count
        }));
        setTodayData(transformedData);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Attendance tracker functions
  const loadAttendanceData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    setIsLoadingAttendance(true);
    try {
      const response = await fetch(
        `/api/admin/attendance-report?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data.employeeSummaries || []);
        setTeamSummary(data.teamSummary || null);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const handleDateRangeChange = (preset: string) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (preset) {
      case 'currentMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'previousMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'last7Days':
        const last7 = new Date(now);
        last7.setDate(now.getDate() - 7);
        startDate = last7.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'last30Days':
        const last30 = new Date(now);
        last30.setDate(now.getDate() - 30);
        startDate = last30.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'custom':
        // Keep existing custom dates
        return;
    }

    setDateRange({ startDate, endDate, preset });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value,
      preset: 'custom'
    }));
  };

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getFilteredAndSortedData = () => {
    let filtered = attendanceData.filter(emp => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof EmployeeSummary];
      const bVal = b[sortConfig.key as keyof EmployeeSummary];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    return filtered;
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/admin/today-export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export CSV');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export CSV');
    }
  };

  // TODO: Implement proper Google Sheets API integration
  // For now, this is disabled to avoid confusion with CSV export
  const handleExportGoogleSheets = async () => {
    // This function is temporarily disabled
    alert('Google Sheets export is temporarily disabled. Please use CSV export instead.');
  };

  // Attendance tracker export functions
  const exportTeamSummary = () => {
    if (!teamSummary || !attendanceData.length) return;

    const headers = [
      'Employee Name',
      'Days Present',
      'Office Days',
      'Remote Days',
      'Total Hours',
      'Office Hours',
      'Remote Hours',
      'Average Hours/Day',
      'Attendance Rate %'
    ];

    const csvContent = [
      headers.join(','),
      ...attendanceData.map(emp => [
        `"${emp.name}"`,
        emp.daysPresent,
        emp.officeDays,
        emp.remoteDays,
        emp.totalHours,
        emp.officeHours,
        emp.remoteHours,
        emp.averageHoursPerDay,
        emp.attendanceRate
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-attendance-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportEmployeeDetail = (employee: EmployeeSummary) => {
    const headers = [
      'Date',
      'Check-in Time',
      'Check-out Time',
      'Hours Worked',
      'Mode',
      'Status',
      'Mood',
      'Mood Comment'
    ];

    const csvContent = [
      headers.join(','),
      ...employee.sessions.map(session => [
        session.date,
        `"${session.checkinTime}"`,
        `"${session.checkoutTime}"`,
        `"${session.hoursWorked}"`,
        session.mode,
        session.status,
        session.mood || '',
        `"${session.moodComment || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employee.name.replace(/\s+/g, '-')}-attendance-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Session reset functions
  const handleResetSessions = () => {
    setShowResetDialog(true);
    setResetCountdown(5);
    setResetResult(null);
  };

  const confirmReset = () => {
    if (resetCountdown > 0) return;
    
    setIsResetting(true);
    fetch('/api/admin/reset-sessions', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          setResetResult(`Error: ${data.error}`);
        } else {
          setResetResult(`Success: ${data.message}`);
          // Reload stats after reset
          loadStats();
          loadUserStats();
          loadTodayData();
        }
      })
      .catch(error => {
        setResetResult(`Error: ${error.message}`);
      })
      .finally(() => {
        setIsResetting(false);
        setTimeout(() => {
          setShowResetDialog(false);
          setResetResult(null);
        }, 3000);
      });
  };

  const cancelReset = () => {
    setShowResetDialog(false);
    setResetCountdown(5);
    setResetResult(null);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST'
      });
      
      if (response.ok) {
        // Redirect to login page
        window.location.href = '/admin/login';
      } else {
        console.error('Logout failed');
        // Fallback: redirect anyway
        window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect anyway
      window.location.href = '/admin/login';
    }
  };

  // User management states
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({ fullName: '', email: '' });
  const [editUserData, setEditUserData] = useState({ fullName: '', email: '', active: true });

  // AI states
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedAiFeature, setSelectedAiFeature] = useState<string>('');
  const [aiTimeRange, setAiTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<string>('');

  // User management functions
  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      });

      if (response.ok) {
        setShowAddUserDialog(false);
        setNewUserData({ fullName: '', email: '' });
        loadAllUsers();
        alert('User added successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to add user');
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          ...editUserData
        })
      });

      if (response.ok) {
        setShowEditUserDialog(false);
        setEditingUser(null);
        setEditUserData({ fullName: '', email: '', active: true });
        loadAllUsers();
        alert('User updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to update user');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadAllUsers();
        alert('User deactivated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to deactivate user');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      fullName: user.full_name,
      email: user.email || '',
      active: user.active
    });
    setShowEditUserDialog(true);
  };

  // AI functions
  const loadHistoricalData = async (range: 'today' | 'week' | 'month') => {
    try {
      const response = await fetch(`/api/admin/historical-data?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data.attendanceData);
        return data.attendanceData;
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
    return [];
  };

  const loadMoodData = async (range: 'today' | 'week' | 'month') => {
    try {
      const response = await fetch(`/api/admin/mood-data?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setMoodData(data.moodData);
        return data.moodData;
      }
    } catch (error) {
      console.error('Error loading mood data:', error);
    }
    return [];
  };

  const generateAiInsights = async () => {
    setIsAiLoading(true);
    setSelectedAiFeature('insights');
    try {
      // Load data based on selected time range
      const dataToAnalyze = aiTimeRange === 'today' ? todayData : await loadHistoricalData(aiTimeRange);
      
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attendanceData: dataToAnalyze,
          timeRange: aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiInsights(data.insights);
      } else {
        setAiInsights('Failed to generate insights. Please try again.');
      }
    } catch (error) {
      setAiInsights('Error generating insights. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateAiReport = async () => {
    setIsAiLoading(true);
    setSelectedAiFeature('report');
    try {
      // Load data based on selected time range
      const dataToAnalyze = aiTimeRange === 'today' ? todayData : await loadHistoricalData(aiTimeRange);
      
      const response = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attendanceData: dataToAnalyze,
          timeRange: aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiReport(data.report);
      } else {
        setAiReport('Failed to generate report. Please try again.');
      }
    } catch (error) {
      setAiReport('Error generating report. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateSentimentAnalysis = async () => {
    setIsAiLoading(true);
    setSelectedAiFeature('sentiment');
    try {
      // Load mood data based on selected time range
      const moodDataToAnalyze = await loadMoodData(aiTimeRange);
      
      if (moodDataToAnalyze.length === 0) {
        setSentimentAnalysis('No mood data available for the selected time range.');
        return;
      }
      
      const response = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          moodData: moodDataToAnalyze,
          timeRange: aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSentimentAnalysis(data.sentiment);
      } else {
        setSentimentAnalysis('Failed to generate sentiment analysis. Please try again.');
      }
    } catch (error) {
      setSentimentAnalysis('Error generating sentiment analysis. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (showResetDialog && resetCountdown > 0) {
      const timer = setTimeout(() => {
        setResetCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showResetDialog, resetCountdown]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-cal-sans text-3xl font-semibold text-purple-600 tracking-tight">
              insyde
            </h1>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
              <p className="text-gray-600">Attendance analytics and insights</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin-chat'}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Mode
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('dashboard')}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('users')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            User Management
          </Button>
          <Button
            variant={activeTab === 'ai' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('ai')}
            className="flex-1"
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Insights
          </Button>
          <Button
            variant={activeTab === 'leave' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('leave')}
            className="flex-1"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Leave Management
          </Button>
        </div>

        {/* Reset Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Reset All Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resetResult ? (
                  <div className="text-center">
                    <p className={resetResult.startsWith('Success') ? 'text-green-600' : 'text-red-600'}>
                      {resetResult}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <p className="text-gray-700">
                        This will check out all currently active sessions. This action cannot be undone.
                      </p>
                      <p className="text-sm text-gray-500">
                        Are you sure you want to continue?
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={confirmReset}
                        disabled={resetCountdown > 0 || isResetting}
                        className="flex-1"
                      >
                        {isResetting ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : resetCountdown > 0 ? (
                          `Confirm (${resetCountdown}s)`
                        ) : (
                          'Confirm Reset'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelReset}
                        disabled={isResetting}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Tab Content - Attendance Tracker */}
        {activeTab === 'dashboard' && (
          <>
            {/* Date Range Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Attendance Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Preset Options */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Select</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { key: 'currentMonth', label: 'Current Month' },
                        { key: 'previousMonth', label: 'Previous Month' },
                        { key: 'last7Days', label: 'Last 7 Days' },
                        { key: 'last30Days', label: 'Last 30 Days' }
                      ].map((preset) => (
                        <Button
                          key={preset.key}
                          variant={dateRange.preset === preset.key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDateRangeChange(preset.key)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Custom Range</label>
                    <div className="flex gap-4 items-center">
                      <div>
                        <label className="text-xs text-gray-500">Start Date</label>
                        <Input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                          className="w-40"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">End Date</label>
                        <Input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                          className="w-40"
                        />
                      </div>
                      <Button
                        onClick={loadAttendanceData}
                        disabled={!dateRange.startDate || !dateRange.endDate || isLoadingAttendance}
                        className="mt-6"
                      >
                        {isLoadingAttendance ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Selected Date Range Display */}
                  {dateRange.startDate && dateRange.endDate && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <strong>Selected Period:</strong> {dateRange.startDate} to {dateRange.endDate}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Summary */}
            {teamSummary && (
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Team Summary
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={exportTeamSummary}
                    disabled={!attendanceData.length}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Team Summary
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{teamSummary.totalEmployees}</p>
                      <p className="text-sm text-gray-600">Employees</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{teamSummary.totalWorkingDays}</p>
                      <p className="text-sm text-gray-600">Working Days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{teamSummary.totalHours.toFixed(1)}h</p>
                      <p className="text-sm text-gray-600">Total Hours</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{teamSummary.averageAttendanceRate.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">Avg Attendance</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-700">{teamSummary.officePercentage.toFixed(1)}%</p>
                      <p className="text-sm text-blue-600">Office Work</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-semibold text-green-700">{teamSummary.remotePercentage.toFixed(1)}%</p>
                      <p className="text-sm text-green-600">Remote Work</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Employee Attendance Table */}
            {attendanceData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Employee Attendance
                    </CardTitle>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                          Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('daysPresent')}>
                          Days Present {sortConfig.key === 'daysPresent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('officeDays')}>
                          Office Days {sortConfig.key === 'officeDays' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('remoteDays')}>
                          Remote Days {sortConfig.key === 'remoteDays' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('totalHours')}>
                          Total Hours {sortConfig.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('averageHoursPerDay')}>
                          Avg Hours/Day {sortConfig.key === 'averageHoursPerDay' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('attendanceRate')}>
                          Attendance % {sortConfig.key === 'attendanceRate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedData().map((employee) => (
                        <>
                          <TableRow 
                            key={employee.employee_id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleEmployeeExpansion(employee.employee_id)}
                          >
                            <TableCell className="font-medium flex items-center gap-2">
                              {expandedEmployees.has(employee.employee_id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )} {employee.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">{employee.daysPresent}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">{employee.officeDays}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{employee.remoteDays}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{employee.totalHours.toFixed(1)}h</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{employee.averageHoursPerDay.toFixed(1)}h</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={employee.attendanceRate >= 80 ? 'default' : employee.attendanceRate >= 60 ? 'secondary' : 'destructive'}>
                                {employee.attendanceRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportEmployeeDetail(employee);
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row - Daily Breakdown */}
                          {expandedEmployees.has(employee.employee_id) && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <div className="bg-gray-50 p-4">
                                  <h4 className="font-medium text-gray-900 mb-3">Daily Sessions for {employee.name}</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Check-in</TableHead>
                                        <TableHead>Check-out</TableHead>
                                        <TableHead>Hours</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Mood</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {employee.sessions.map((session) => (
                                        <TableRow key={session.id}>
                                          <TableCell>{session.date}</TableCell>
                                          <TableCell>{session.checkinTime}</TableCell>
                                          <TableCell>{session.checkoutTime}</TableCell>
                                          <TableCell>{session.hoursWorked}</TableCell>
                                          <TableCell>
                                            <Badge variant={session.mode === 'office' ? 'default' : 'secondary'}>
                                              {session.mode}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={session.status === 'Complete' ? 'default' : 'secondary'}>
                                              {session.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {session.mood && (
                                              <Badge variant="outline">{session.mood}</Badge>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* No Data State */}
            {!isLoadingAttendance && attendanceData.length === 0 && dateRange.startDate && dateRange.endDate && (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
                  <p className="text-gray-600">No attendance records found for the selected date range.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* User Management Tab Content */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleResetSessions}
                  disabled={isResetting}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Reset All Sessions
                </Button>
                <Button
                  onClick={() => setShowAddUserDialog(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-sm">{user.slug}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivateUser(user.id)}
                            disabled={!user.active}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* AI Insights Tab Content */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Brain className="w-6 h-6" />
                  AI-Powered HR Insights
                </CardTitle>
                <p className="text-gray-600">
                  Get intelligent insights about your team's engagement, well-being, and productivity patterns
                </p>
              </CardHeader>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setAiTimeRange('today'); setSelectedAiFeature('insights'); }}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Daily Check-in</h3>
                  <p className="text-sm text-gray-600 mb-4">Quick insights for today's team status</p>
                  <Button size="sm" className="w-full">
                    Analyze Today
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setAiTimeRange('week'); setSelectedAiFeature('insights'); }}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Weekly Review</h3>
                  <p className="text-sm text-gray-600 mb-4">Comprehensive weekly team analysis</p>
                  <Button size="sm" variant="outline" className="w-full">
                    Review This Week
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setAiTimeRange('month'); setSelectedAiFeature('report'); }}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Monthly Report</h3>
                  <p className="text-sm text-gray-600 mb-4">Executive summary and recommendations</p>
                  <Button size="sm" variant="outline" className="w-full">
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Configure Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Time Range Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Select Time Range
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'today', label: 'Today', icon: Clock, description: 'Current day insights' },
                      { key: 'week', label: 'This Week', icon: TrendingUp, description: 'Weekly patterns' },
                      { key: 'month', label: 'This Month', icon: BarChart3, description: 'Monthly trends' }
                    ].map((range) => (
                      <div
                        key={range.key}
                        className={`flex-1 min-w-[120px] p-4 border rounded-lg cursor-pointer transition-all ${
                          aiTimeRange === range.key 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setAiTimeRange(range.key as any)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <range.icon className="w-4 h-4" />
                          <span className="font-medium">{range.label}</span>
                        </div>
                        <p className="text-xs text-gray-600">{range.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analysis Type Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Choose Analysis Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAiFeature === 'insights' 
                          ? 'border-yellow-500 bg-yellow-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAiFeature('insights')}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium">Engagement Insights</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Work-life balance, team dynamics, and well-being patterns
                      </p>
                    </div>

                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAiFeature === 'report' 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAiFeature('report')}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Executive Report</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Professional summary with actionable recommendations
                      </p>
                    </div>

                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAiFeature === 'sentiment' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAiFeature('sentiment')}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Mood Analysis</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Employee sentiment and well-being indicators
                      </p>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      if (selectedAiFeature === 'insights') generateAiInsights();
                      else if (selectedAiFeature === 'report') generateAiReport();
                      else if (selectedAiFeature === 'sentiment') generateSentimentAnalysis();
                    }}
                    disabled={isAiLoading || !selectedAiFeature}
                    size="lg"
                    className="px-8"
                  >
                    {isAiLoading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        {selectedAiFeature === 'insights' && 'Analyzing Engagement...'}
                        {selectedAiFeature === 'report' && 'Generating Report...'}
                        {selectedAiFeature === 'sentiment' && 'Analyzing Mood...'}
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate {selectedAiFeature === 'insights' ? 'Insights' : selectedAiFeature === 'report' ? 'Report' : 'Analysis'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Results Display */}
            {(aiInsights || aiReport || sentimentAnalysis) && (
              <div className="space-y-6">
                {/* Results Header */}
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Brain className="w-5 h-5" />
                      AI Analysis Complete
                    </CardTitle>
                    <p className="text-gray-600">
                      Your AI-powered insights are ready. Review the analysis below and take action on the recommendations.
                    </p>
                  </CardHeader>
                </Card>

                {/* AI Insights Display */}
                {aiInsights && (
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-yellow-700">
                          <Lightbulb className="w-5 h-5" />
                          Employee Engagement Insights
                        </CardTitle>
                        <Badge variant="outline" className="text-yellow-600">
                          {aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-gray-700">{aiInsights}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(aiInsights)}>
                          Copy Insights
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const blob = new Blob([aiInsights], { type: 'text/plain' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `engagement-insights-${aiTimeRange}-${new Date().toISOString().split('T')[0]}.txt`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }}>
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Report Display */}
                {aiReport && (
                  <Card className="border-purple-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <BarChart3 className="w-5 h-5" />
                          Executive Report
                        </CardTitle>
                        <Badge variant="outline" className="text-purple-600">
                          {aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-gray-700">{aiReport}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(aiReport)}>
                          Copy Report
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const blob = new Blob([aiReport], { type: 'text/plain' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `executive-report-${aiTimeRange}-${new Date().toISOString().split('T')[0]}.txt`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }}>
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sentiment Analysis Display */}
                {sentimentAnalysis && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <MessageSquare className="w-5 h-5" />
                          Mood & Well-being Analysis
                        </CardTitle>
                        <Badge variant="outline" className="text-green-600">
                          {aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-gray-700">{sentimentAnalysis}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(sentimentAnalysis)}>
                          Copy Analysis
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const blob = new Blob([sentimentAnalysis], { type: 'text/plain' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `mood-analysis-${aiTimeRange}-${new Date().toISOString().split('T')[0]}.txt`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }}>
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Items */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Lightbulb className="w-5 h-5" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Based on your AI analysis, consider these actions:
                      </p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Review individual employee patterns and reach out for support if needed
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Share insights with your team during one-on-ones or team meetings
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Consider policy adjustments based on well-being recommendations
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Schedule follow-up analysis to track improvements over time
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Help & Tips */}
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <MessageSquare className="w-5 h-5" />
                  How to Use AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Quick Start Guide</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">1</div>
                        <div>
                          <p className="font-medium">Choose a quick action</p>
                          <p className="text-xs">Click "Daily Check-in", "Weekly Review", or "Monthly Report" for common use cases</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">2</div>
                        <div>
                          <p className="font-medium">Or customize your analysis</p>
                          <p className="text-xs">Select time range and analysis type for specific insights</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">3</div>
                        <div>
                          <p className="font-medium">Review and act</p>
                          <p className="text-xs">Export insights, copy to clipboard, or share with your team</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">AI Features</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600" />
                        <span><strong>Engagement Insights:</strong> Work-life balance and team dynamics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span><strong>Executive Reports:</strong> Professional summaries and recommendations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <span><strong>Mood Analysis:</strong> Employee well-being and sentiment patterns</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      Powered by Moonshot AI's Kimi K2 model via OpenRouter API
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add User Dialog */}
        {showAddUserDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    placeholder="Enter full name"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddUser}
                    disabled={!newUserData.fullName.trim()}
                    className="flex-1"
                  >
                    Add User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddUserDialog(false);
                      setNewUserData({ fullName: '', email: '' });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave Management Tab Content */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
                <p className="text-gray-600">Manage employee leave requests and balances</p>
              </div>
            </div>
            
            {/* Leave Management Component */}
            <AdminLeaveManagement />
          </div>
        )}

        {/* Edit User Dialog */}
        {showEditUserDialog && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    placeholder="Enter full name"
                    value={editUserData.fullName}
                    onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editUserData.active}
                    onChange={(e) => setEditUserData({ ...editUserData, active: e.target.checked })}
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Active User
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleEditUser}
                    disabled={!editUserData.fullName.trim()}
                    className="flex-1"
                  >
                    Update User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditUserDialog(false);
                      setEditingUser(null);
                      setEditUserData({ fullName: '', email: '', active: true });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
