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
import { AlertTriangle, Clock, Users, TrendingUp, LogOut } from 'lucide-react';

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
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('admin_authenticated');
              }}
            >
              Logout
            </Button>
          </div>
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
                <CardTitle>User In Office vs Days</CardTitle>
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
                <CardTitle>Time Spent by Users</CardTitle>
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
                    <TableHead>Days Present</TableHead>
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
      </div>
    </div>
  );
}
