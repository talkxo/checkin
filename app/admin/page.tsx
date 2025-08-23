"use client";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { AlertTriangle, Clock, Users, TrendingUp, LogOut, Download, FileSpreadsheet, UserPlus, Edit, Trash2, Eye, Brain, Lightbulb, MessageSquare, BarChart3 } from 'lucide-react';

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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'fortnight' | 'month' | '6months' | 'year'>('week');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [todayData, setTodayData] = useState<TodayData[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'ai'>('dashboard');
  
  // Session reset states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(5);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simple admin authentication (in production, use proper auth)
    if (username === 'admin' && password === 'talkxo2024') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
    } else {
      alert('Invalid credentials');
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('admin_authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadUserStats();
      loadChartData();
      loadTodayData();
      loadAllUsers();
    }
  }, [isAuthenticated, timeRange]);

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

  const handleExportGoogleSheets = () => {
    // For Google Sheets integration, we would need:
    // 1. Google Sheets API credentials
    // 2. OAuth2 setup
    // 3. Service account or user authentication
    // 4. API calls to create/update sheets
    alert('Google Sheets export requires additional setup. For now, please use CSV export.');
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

  const handleLogout = () => {
    // Clear authentication
    localStorage.removeItem('admin_authenticated');
    // Redirect to login
    window.location.href = '/admin/login';
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Attendance analytics and insights</p>
          </div>
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

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Today's Attendance Summary */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Today's Attendance
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={todayData.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportGoogleSheets}
                    disabled={todayData.length === 0}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Google Sheets
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>First In</TableHead>
                      <TableHead>Last Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayData.map((emp, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.firstIn}</TableCell>
                        <TableCell>{emp.lastOut}</TableCell>
                        <TableCell>{emp.totalHours}</TableCell>
                        <TableCell>{emp.mode}</TableCell>
                        <TableCell>
                          <Badge variant={emp.status === 'Active' ? 'default' : emp.status === 'Complete' ? 'secondary' : 'outline'}>
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{emp.sessions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Time Range Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'week', label: 'Week' },
                    { key: 'fortnight', label: 'Fortnight' },
                    { key: 'month', label: 'Month' },
                    { key: '6months', label: '6 Months' },
                    { key: 'year', label: 'Year' }
                  ].map((range) => (
                    <Button
                      key={range.key}
                      variant={timeRange === range.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(range.key as any)}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Employees</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Today</p>
                        <p className="text-2xl font-bold text-green-600">{stats.activeToday}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Office</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.officeCount}</p>
                      </div>
                      <Badge variant="default">Office</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Remote</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.remoteCount}</p>
                      </div>
                      <Badge variant="secondary">Remote</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            {chartData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Office vs Remote Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Bar
                      data={chartData.officeVsRemote}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                        },
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hours Spent by Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Line
                      data={chartData.timeSpent}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Statistics Table */}
            {userStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Individual User Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Office Hours</TableHead>
                        <TableHead>Remote Hours</TableHead>
                        <TableHead>Office Days</TableHead>
                        <TableHead>Remote Days</TableHead>
                        <TableHead>Total Days</TableHead>
                        <TableHead>Avg Hours/Day</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStats.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="default">{user.totalHours}h</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{user.officeHours}h</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.remoteHours}h</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.officeDays || 0} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.remoteDays || 0} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.daysPresent} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.daysPresent > 0 ? (user.totalHours / user.daysPresent).toFixed(1) : 0}h
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
              <Button
                onClick={() => setShowAddUserDialog(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </Button>
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
            {/* AI Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI-Powered HR Insights & Employee Engagement Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Time Range Selection */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Analysis Time Range
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'week', label: 'This Week' },
                      { key: 'month', label: 'This Month' }
                    ].map((range) => (
                      <Button
                        key={range.key}
                        variant={aiTimeRange === range.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAiTimeRange(range.key as any)}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Combined AI Analysis */}
                <div className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Brain className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xl font-semibold text-gray-900">HR-Focused AI Analysis</h3>
                    </div>
                    <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                      Get comprehensive employee engagement insights, well-being analysis, and actionable HR recommendations. 
                      Our AI analyzes patterns from an empathetic, employee-centric perspective.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-semibold">Employee Engagement Insights</h4>
                      </div>
                      <p className="text-xs text-gray-600">
                        Work-life balance, team dynamics, well-being indicators, and engagement patterns
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold">Professional HR Reports</h4>
                      </div>
                      <p className="text-xs text-gray-600">
                        Executive summaries, actionable recommendations, and empathy-driven insights
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      onClick={generateAiInsights}
                      disabled={isAiLoading}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      {isAiLoading && selectedAiFeature === 'insights' ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="w-4 h-4" />
                          Generate Insights
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={generateAiReport}
                      disabled={isAiLoading}
                      size="lg"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isAiLoading && selectedAiFeature === 'report' ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          Generate Report
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={generateSentimentAnalysis}
                      disabled={isAiLoading}
                      size="lg"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isAiLoading && selectedAiFeature === 'sentiment' ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          Sentiment Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights Display */}
            {aiInsights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    AI Attendance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">{aiInsights}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Report Display */}
            {aiReport && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    AI-Generated Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">{aiReport}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sentiment Analysis Display */}
            {sentimentAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    Sentiment Analysis & Mood Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">{sentimentAnalysis}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Features Info */}
            <Card>
              <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    HR-Focused AI Features Powered by Kimi K2
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    <strong>Employee Engagement Analysis:</strong> Analyzes work-life balance, team dynamics, well-being indicators, and engagement patterns from an empathetic perspective.
                  </p>
                  <p>
                    <strong>Professional HR Reports:</strong> Generates comprehensive reports with executive summaries, actionable recommendations, and empathy-driven insights.
                  </p>
                  <p>
                    <strong>Historical Analysis:</strong> Provides insights across different time ranges (Today, This Week, This Month) for better trend analysis.
                  </p>
                  <p>
                    <strong>Empathy-Driven Insights:</strong> Focuses on individual employee stories, personal circumstances, and supportive intervention opportunities.
                  </p>
                  <p>
                    <strong>Sentiment Analysis:</strong> Analyzes employee mood patterns, stress indicators, and well-being trends for proactive support and engagement.
                  </p>
                  <p className="text-xs text-gray-500">
                    Powered by Moonshot AI's Kimi K2 model via OpenRouter API
                  </p>
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
