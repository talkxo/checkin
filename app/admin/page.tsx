"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AdminStats {
  totalEmployees: number;
  activeToday: number;
  officeToday: number;
  remoteToday: number;
  avgWorkHours: number;
}

interface DailyStats {
  date: string;
  office: number;
  remote: number;
  total: number;
}

interface TodaySnapshot {
  id: string;
  full_name: string;
  lastIn: string | null;
  lastOut: string | null;
  workedHours: string;
  mode: string;
  open: boolean;
}

interface UserStats {
  id: string;
  full_name: string;
  officeHours: number;
  remoteHours: number;
  totalHours: number;
  daysWorked: number;
  officeMinutes: number;
  remoteMinutes: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [todaySnapshot, setTodaySnapshot] = useState<TodaySnapshot[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'fortnight' | 'month' | '6m' | 'year'>('week');
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchDashboardData();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simple authentication - in production, this should be server-side
    if (username === 'admin' && password === 'talkxo2024') {
      localStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      fetchDashboardData();
      alert('Login successful!');
    } else {
      alert('Invalid credentials');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch current stats
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch today's snapshot
      const snapshotRes = await fetch('/api/today/summary');
      if (snapshotRes.ok) {
        const snapshotData = await snapshotRes.json();
        setTodaySnapshot(snapshotData);
      }

      // Fetch user stats
      await fetchUserStats();

      // Fetch daily stats for charts
      await fetchDailyStats();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchDailyStats = async () => {
    try {
      const res = await fetch(`/api/admin/daily-stats?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setDailyStats(data);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`/api/admin/user-stats?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDailyStats();
      fetchUserStats();
    }
  }, [timeRange, isAuthenticated]);

  // Users vs Days Chart Data
  const usersVsDaysData = {
    labels: userStats.map(user => user.full_name),
    datasets: [
      {
        label: 'Days Worked',
        data: userStats.map(user => user.daysWorked),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  // Time Spent Chart Data
  const timeSpentData = {
    labels: userStats.map(user => user.full_name),
    datasets: [
      {
        label: 'Office Hours',
        data: userStats.map(user => user.officeHours),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Remote Hours',
        data: userStats.map(user => user.remoteHours),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      },
    ],
  };

  // Attendance Trend Chart Data
  const chartData = {
    labels: dailyStats.map(stat => {
      const date = new Date(stat.date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Office',
        data: dailyStats.map(stat => stat.office),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1,
      },
      {
        label: 'Remote',
        data: dailyStats.map(stat => stat.remote),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.5)',
        tension: 0.1,
      },
      {
        label: 'Total',
        data: dailyStats.map(stat => stat.total),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Attendance Trend - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Username
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <Input
                    type="password"
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
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt mr-2"></i>
            Logout
          </Button>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-foreground mb-3">Time Range</label>
          <div className="flex flex-wrap gap-2">
            {['week', 'fortnight', 'month', '6m', 'year'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                onClick={() => setTimeRange(range as any)}
              >
                {range === '6m' ? '6 Months' : range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="text-center pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Employees</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Active Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeToday}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">In Office</p>
                <p className="text-3xl font-bold text-blue-600">{stats.officeToday}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Remote</p>
                <p className="text-3xl font-bold text-purple-600">{stats.remoteToday}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users vs Days Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Users vs Days Worked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={usersVsDaysData} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Time Spent Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Time Spent: Office vs Remote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={timeSpentData} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {todaySnapshot.length === 0 ? (
                  <p className="text-muted-foreground text-center">No check-ins today</p>
                ) : (
                  todaySnapshot.map((emp) => (
                    <Card key={emp.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-foreground">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {emp.lastIn ? `In: ${emp.lastIn}` : 'Not checked in'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {emp.mode}
                          </Badge>
                          {emp.open && (
                            <Badge variant="destructive" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      {emp.workedHours !== '0h 0m' && (
                        <p className="text-xs text-blue-600">Worked: {emp.workedHours}</p>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Individual User Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Days Worked</TableHead>
                    <TableHead>Office Hours</TableHead>
                    <TableHead>Remote Hours</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Office %</TableHead>
                    <TableHead>Remote %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.map((user) => {
                    const totalMinutes = user.officeMinutes + user.remoteMinutes;
                    const officePercentage = totalMinutes > 0 ? Math.round((user.officeMinutes / totalMinutes) * 100) : 0;
                    const remotePercentage = totalMinutes > 0 ? Math.round((user.remoteMinutes / totalMinutes) * 100) : 0;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.daysWorked}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.officeHours}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.remoteHours}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {user.totalHours}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {officePercentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {remotePercentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
