"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">
              Admin Login
            </h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Logout
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">Time Range</label>
          <div className="flex flex-wrap gap-2">
            {['week', 'fortnight', 'month', '6m', 'year'].map((range) => (
              <button
                key={range}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setTimeRange(range as any)}
              >
                {range === '6m' ? '6 Months' : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Employees</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalEmployees}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Active Today</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeToday}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">In Office</p>
              <p className="text-3xl font-bold text-blue-600">{stats.officeToday}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Remote</p>
              <p className="text-3xl font-bold text-purple-600">{stats.remoteToday}</p>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users vs Days Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Users vs Days Worked</h3>
            <div className="h-80">
              <Bar data={usersVsDaysData} options={barChartOptions} />
            </div>
          </div>

          {/* Time Spent Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Spent: Office vs Remote</h3>
            <div className="h-80">
              <Bar data={timeSpentData} options={barChartOptions} />
            </div>
          </div>
        </div>

        {/* Attendance Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Trend</h3>
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Snapshot</h3>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {todaySnapshot.length === 0 ? (
                <p className="text-gray-500 text-center">No check-ins today</p>
              ) : (
                todaySnapshot.map((emp) => (
                  <div key={emp.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{emp.full_name}</p>
                        <p className="text-xs text-gray-600">
                          {emp.lastIn ? `In: ${emp.lastIn}` : 'Not checked in'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.mode === 'office' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {emp.mode}
                        </span>
                        {emp.open && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    {emp.workedHours !== '0h 0m' && (
                      <p className="text-xs text-blue-600">Worked: {emp.workedHours}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User Statistics Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Individual User Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 font-medium text-gray-700">Employee</th>
                  <th className="text-left py-3 font-medium text-gray-700">Days Worked</th>
                  <th className="text-left py-3 font-medium text-gray-700">Office Hours</th>
                  <th className="text-left py-3 font-medium text-gray-700">Remote Hours</th>
                  <th className="text-left py-3 font-medium text-gray-700">Total Hours</th>
                  <th className="text-left py-3 font-medium text-gray-700">Office %</th>
                  <th className="text-left py-3 font-medium text-gray-700">Remote %</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((user) => {
                  const totalMinutes = user.officeMinutes + user.remoteMinutes;
                  const officePercentage = totalMinutes > 0 ? Math.round((user.officeMinutes / totalMinutes) * 100) : 0;
                  const remotePercentage = totalMinutes > 0 ? Math.round((user.remoteMinutes / totalMinutes) * 100) : 0;
                  
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{user.full_name}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.daysWorked}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.officeHours}h
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.remoteHours}h
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {user.totalHours}h
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {officePercentage}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {remotePercentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
