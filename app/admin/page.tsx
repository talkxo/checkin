"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminLeaveManagement from '@/components/admin-leave-management';
import DarkModeToggle from '@/components/dark-mode-toggle';
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
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png" 
                alt="insyde" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Attendance analytics and insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/admin-chat'}
              className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Mode
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border/50 dark:border-border mb-6 overflow-x-auto">
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-primary text-foreground dark:text-foreground'
                : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Dashboard
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-primary text-foreground dark:text-foreground'
                : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <Users className="w-4 h-4 inline mr-2" />
            User Management
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-primary text-foreground dark:text-foreground'
                : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('ai')}
          >
            <Brain className="w-4 h-4 inline mr-2" />
            AI Insights
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
              activeTab === 'leave'
                ? 'border-primary text-foreground dark:text-foreground'
                : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('leave')}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Leave Management
          </button>
        </div>

        {/* Reset Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 max-w-md w-full elevation-xl">
              <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Reset All Sessions
                </h3>
              </div>
              <div className="space-y-4">
                {resetResult ? (
                  <div className="text-center">
                    <p className={resetResult.startsWith('Success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                      {resetResult}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <p className="text-foreground dark:text-foreground">
                        This will check out all currently active sessions. This action cannot be undone.
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        Are you sure you want to continue?
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
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
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Date Range Selector */}
                <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Attendance Tracker
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {/* Preset Options */}
                    <div>
                      <label className="text-sm font-medium text-foreground dark:text-foreground mb-2 block">Quick Select</label>
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
                      <label className="text-sm font-medium text-foreground dark:text-foreground mb-2 block">Custom Range</label>
                      <div className="flex gap-4 items-center flex-wrap">
                        <div>
                          <label className="text-xs text-muted-foreground dark:text-muted-foreground">Start Date</label>
                          <Input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                            className="w-40 bg-background dark:bg-background border-border dark:border-border"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground dark:text-muted-foreground">End Date</label>
                          <Input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                            className="w-40 bg-background dark:bg-background border-border dark:border-border"
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
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground bg-muted dark:bg-muted p-3 rounded-lg">
                        <strong className="text-foreground dark:text-foreground">Selected Period:</strong> {dateRange.startDate} to {dateRange.endDate}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Summary */}
                {teamSummary && (
                  <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
                      <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Team Summary
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportTeamSummary}
                        disabled={!attendanceData.length}
                        className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Team Summary
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{teamSummary.totalEmployees}</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Employees</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{teamSummary.totalWorkingDays}</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Working Days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{teamSummary.totalHours.toFixed(1)}h</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Total Hours</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{teamSummary.averageAttendanceRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Avg Attendance</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted dark:bg-muted rounded-lg">
                        <p className="text-lg font-semibold text-foreground dark:text-foreground">{teamSummary.officePercentage.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Office Work</p>
                      </div>
                      <div className="text-center p-3 bg-muted dark:bg-muted rounded-lg">
                        <p className="text-lg font-semibold text-foreground dark:text-foreground">{teamSummary.remotePercentage.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Remote Work</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Employee Attendance Table */}
                {attendanceData.length > 0 && (
                  <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
                      <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Employee Attendance
                      </h3>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search employees..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-64 bg-background dark:bg-background border-border dark:border-border"
                        />
                      </div>
                    </div>
                    <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                          Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('daysPresent')}>
                          Days Present {sortConfig.key === 'daysPresent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('officeDays')}>
                          Office Days {sortConfig.key === 'officeDays' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('remoteDays')}>
                          Remote Days {sortConfig.key === 'remoteDays' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('totalHours')}>
                          Total Hours {sortConfig.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('averageHoursPerDay')}>
                          Avg Hours/Day {sortConfig.key === 'averageHoursPerDay' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer text-foreground dark:text-foreground hover:text-primary transition-colors" onClick={() => handleSort('attendanceRate')}>
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
                            className="cursor-pointer hover:bg-muted/30 dark:hover:bg-muted/30 transition-colors"
                            onClick={() => toggleEmployeeExpansion(employee.employee_id)}
                          >
                            <TableCell className="font-medium flex items-center gap-2 text-foreground dark:text-foreground">
                              {expandedEmployees.has(employee.employee_id) ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
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
                                <div className="bg-muted dark:bg-muted p-4">
                                  <h4 className="font-medium text-foreground dark:text-foreground mb-3">Daily Sessions for {employee.name}</h4>
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
                  </div>
                )}

                {/* No Data State */}
                {!isLoadingAttendance && attendanceData.length === 0 && dateRange.startDate && dateRange.endDate && (
                  <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-12 elevation-md text-center">
                    <Users className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">No Attendance Data</h3>
                    <p className="text-muted-foreground dark:text-muted-foreground">No attendance records found for the selected date range.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Management
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleResetSessions}
                        disabled={isResetting}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Reset All Sessions
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowAddUserDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add User
                      </Button>
                    </div>
                  </div>
                  <div>
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
                      <TableCell className="font-medium text-foreground dark:text-foreground">{user.full_name}</TableCell>
                      <TableCell className="text-foreground dark:text-foreground">{user.email || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground dark:text-muted-foreground">{user.slug}</TableCell>
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
                </div>
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Welcome Section */}
                <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2 mb-2">
                      <Brain className="w-6 h-6" />
                      AI-Powered HR Insights
                    </h3>
                    <p className="text-muted-foreground dark:text-muted-foreground">
                      Get intelligent insights about your team's engagement, well-being, and productivity patterns
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md card-hover cursor-pointer" onClick={() => { setAiTimeRange('today'); setSelectedAiFeature('insights'); }}>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-muted dark:bg-muted rounded-full mx-auto mb-3">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground dark:text-foreground mb-2">Daily Check-in</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">Quick insights for today's team status</p>
                      <Button size="sm" className="w-full">
                        Analyze Today
                      </Button>
                    </div>
                  </div>

                  <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md card-hover cursor-pointer" onClick={() => { setAiTimeRange('week'); setSelectedAiFeature('insights'); }}>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-muted dark:bg-muted rounded-full mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground dark:text-foreground mb-2">Weekly Review</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">Comprehensive weekly team analysis</p>
                      <Button size="sm" variant="outline" className="w-full">
                        Review This Week
                      </Button>
                    </div>
                  </div>

                  <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md card-hover cursor-pointer" onClick={() => { setAiTimeRange('month'); setSelectedAiFeature('report'); }}>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-muted dark:bg-muted rounded-full mx-auto mb-3">
                        <BarChart3 className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground dark:text-foreground mb-2">Monthly Report</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">Executive summary and recommendations</p>
                      <Button size="sm" variant="outline" className="w-full">
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Analysis Configuration */}
                <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                  <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Configure Analysis
                    </h3>
                  </div>
                  <div className="space-y-6">
                    {/* Time Range Selection */}
                    <div>
                      <label className="text-sm font-medium text-foreground dark:text-foreground mb-3 block">
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
                      <label className="text-sm font-medium text-foreground dark:text-foreground mb-3 block">
                        Choose Analysis Type
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedAiFeature === 'insights' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border dark:border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedAiFeature('insights')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-5 h-5 text-primary" />
                            <span className="font-medium text-foreground dark:text-foreground">Engagement Insights</span>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Work-life balance, team dynamics, and well-being patterns
                          </p>
                        </div>

                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedAiFeature === 'report' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border dark:border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedAiFeature('report')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <span className="font-medium text-foreground dark:text-foreground">Executive Report</span>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Professional summary with actionable recommendations
                          </p>
                        </div>

                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedAiFeature === 'sentiment' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border dark:border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedAiFeature('sentiment')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            <span className="font-medium text-foreground dark:text-foreground">Mood Analysis</span>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
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
                  </div>
                </div>

                {/* AI Results Display */}
                {(aiInsights || aiReport || sentimentAnalysis) && (
                  <div className="space-y-6">
                    {/* Results Header */}
                    <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                      <div className="mb-2">
                        <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2 mb-2">
                          <Brain className="w-5 h-5" />
                          AI Analysis Complete
                        </h3>
                        <p className="text-muted-foreground dark:text-muted-foreground">
                          Your AI-powered insights are ready. Review the analysis below and take action on the recommendations.
                        </p>
                      </div>
                    </div>

                    {/* AI Insights Display */}
                    {aiInsights && (
                      <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                        <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                              <Lightbulb className="w-5 h-5" />
                              Employee Engagement Insights
                            </h3>
                            <Badge variant="outline" className="text-muted-foreground dark:text-muted-foreground">
                              {aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'}
                            </Badge>
                          </div>
                        </div>
                        <div className="bg-muted dark:bg-muted p-4 rounded-lg border border-border/50 dark:border-border">
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-foreground dark:text-foreground">{aiInsights}</div>
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
                      </div>
                    </div>
                  )}

                    {/* AI Report Display */}
                    {aiReport && (
                      <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                        <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                              <BarChart3 className="w-5 h-5" />
                              Executive Report
                            </h3>
                            <Badge variant="outline" className="text-muted-foreground dark:text-muted-foreground">
                              {aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'}
                            </Badge>
                          </div>
                        </div>
                        <div className="bg-muted dark:bg-muted p-4 rounded-lg border border-border/50 dark:border-border">
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-foreground dark:text-foreground">{aiReport}</div>
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
                      </div>
                    )}

                    {/* Sentiment Analysis Display */}
                    {sentimentAnalysis && (
                      <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                        <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                              <MessageSquare className="w-5 h-5" />
                              Mood & Well-being Analysis
                            </h3>
                            <Badge variant="outline" className="text-muted-foreground dark:text-muted-foreground">
                              {aiTimeRange === 'today' ? 'Today' : aiTimeRange === 'week' ? 'This Week' : 'This Month'}
                            </Badge>
                          </div>
                        </div>
                        <div className="bg-muted dark:bg-muted p-4 rounded-lg border border-border/50 dark:border-border">
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-foreground dark:text-foreground">{sentimentAnalysis}</div>
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
                      </div>
                    )}

                    {/* Action Items */}
                    <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                      <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                        <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                          <Lightbulb className="w-5 h-5" />
                          Next Steps
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                          Based on your AI analysis, consider these actions:
                        </p>
                        <ul className="space-y-2 text-sm text-foreground dark:text-foreground">
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            Review individual employee patterns and reach out for support if needed
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            Share insights with your team during one-on-ones or team meetings
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            Consider policy adjustments based on well-being recommendations
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            Schedule follow-up analysis to track improvements over time
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Help & Tips */}
                <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 elevation-md">
                  <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      How to Use AI Insights
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground dark:text-foreground">Quick Start Guide</h4>
                      <div className="space-y-3 text-sm text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-muted dark:bg-muted rounded-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-foreground">1</div>
                          <div>
                            <p className="font-medium text-foreground dark:text-foreground">Choose a quick action</p>
                            <p className="text-xs">Click "Daily Check-in", "Weekly Review", or "Monthly Report" for common use cases</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-muted dark:bg-muted rounded-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-foreground">2</div>
                          <div>
                            <p className="font-medium text-foreground dark:text-foreground">Or customize your analysis</p>
                            <p className="text-xs">Select time range and analysis type for specific insights</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-muted dark:bg-muted rounded-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-foreground">3</div>
                          <div>
                            <p className="font-medium text-foreground dark:text-foreground">Review and act</p>
                            <p className="text-xs">Export insights, copy to clipboard, or share with your team</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground dark:text-foreground">AI Features</h4>
                      <div className="space-y-3 text-sm text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-primary" />
                          <span className="text-foreground dark:text-foreground"><strong>Engagement Insights:</strong> Work-life balance and team dynamics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          <span className="text-foreground dark:text-foreground"><strong>Executive Reports:</strong> Professional summaries and recommendations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span className="text-foreground dark:text-foreground"><strong>Mood Analysis:</strong> Employee well-being and sentiment patterns</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-3">
                        Powered by Moonshot AI's Kimi K2 model via OpenRouter API
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

        {/* Add User Dialog */}
        {showAddUserDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 max-w-md w-full elevation-xl">
              <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New User
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground">Full Name *</label>
                  <Input
                    placeholder="Enter full name"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    className="bg-background dark:bg-background border-border dark:border-border mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground">Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="bg-background dark:bg-background border-border dark:border-border mt-1"
                  />
                </div>
                <div className="flex gap-3">
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
              </div>
            </div>
          </div>
        )}

            {activeTab === 'leave' && (
              <motion.div
                key="leave"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Leave Management</h2>
                  <p className="text-muted-foreground dark:text-muted-foreground">Manage employee leave requests and balances</p>
                </div>
                
                {/* Leave Management Component */}
                <AdminLeaveManagement />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Edit User Dialog */}
        {showEditUserDialog && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-6 max-w-md w-full elevation-xl">
              <div className="mb-4 pb-3 border-b border-border/50 dark:border-border">
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit User
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground">Full Name *</label>
                  <Input
                    placeholder="Enter full name"
                    value={editUserData.fullName}
                    onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
                    className="bg-background dark:bg-background border-border dark:border-border mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground">Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                    className="bg-background dark:bg-background border-border dark:border-border mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editUserData.active}
                    onChange={(e) => setEditUserData({ ...editUserData, active: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-foreground dark:text-foreground">
                    Active User
                  </label>
                </div>
                <div className="flex gap-3">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
