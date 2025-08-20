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
      <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
        <div className="box">
          <h1 className="title is-4 has-text-centered mb-4">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label className="label">Username</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Password</label>
              <div className="control">
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <div className="control">
                <button
                  className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
                  type="submit"
                  disabled={isLoading}
                >
                  Login
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="section">
        {/* Header */}
        <div className="level">
          <div className="level-left">
            <div className="level-item">
              <h1 className="title is-3">Admin Dashboard</h1>
            </div>
          </div>
          <div className="level-right">
            <div className="level-item">
              <button className="button is-light" onClick={handleLogout}>
                <span className="icon">
                  <i className="fas fa-sign-out-alt"></i>
                </span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="field">
          <label className="label">Time Range</label>
          <div className="control">
            <div className="buttons has-addons">
              <button 
                className={`button ${timeRange === 'week' ? 'is-primary' : 'is-light'}`}
                onClick={() => setTimeRange('week')}
              >
                Week
              </button>
              <button 
                className={`button ${timeRange === 'fortnight' ? 'is-primary' : 'is-light'}`}
                onClick={() => setTimeRange('fortnight')}
              >
                Fortnight
              </button>
              <button 
                className={`button ${timeRange === 'month' ? 'is-primary' : 'is-light'}`}
                onClick={() => setTimeRange('month')}
              >
                Month
              </button>
              <button 
                className={`button ${timeRange === '6m' ? 'is-primary' : 'is-light'}`}
                onClick={() => setTimeRange('6m')}
              >
                6 Months
              </button>
              <button 
                className={`button ${timeRange === 'year' ? 'is-primary' : 'is-light'}`}
                onClick={() => setTimeRange('year')}
              >
                Year
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="columns is-multiline mb-5">
            <div className="column is-3">
              <div className="box has-text-centered">
                <p className="heading">Total Employees</p>
                <p className="title is-4">{stats.totalEmployees}</p>
              </div>
            </div>
            <div className="column is-3">
              <div className="box has-text-centered">
                <p className="heading">Active Today</p>
                <p className="title is-4 has-text-success">{stats.activeToday}</p>
              </div>
            </div>
            <div className="column is-3">
              <div className="box has-text-centered">
                <p className="heading">In Office</p>
                <p className="title is-4 has-text-primary">{stats.officeToday}</p>
              </div>
            </div>
            <div className="column is-3">
              <div className="box has-text-centered">
                <p className="heading">Remote</p>
                <p className="title is-4 has-text-link">{stats.remoteToday}</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="columns is-multiline">
          {/* Users vs Days Chart */}
          <div className="column is-6">
            <div className="box">
              <h3 className="title is-5 mb-4">Users vs Days Worked</h3>
              <div style={{ height: '300px', position: 'relative' }}>
                <Bar data={usersVsDaysData} options={barChartOptions} />
              </div>
            </div>
          </div>

          {/* Time Spent Chart */}
          <div className="column is-6">
            <div className="box">
              <h3 className="title is-5 mb-4">Time Spent: Office vs Remote</h3>
              <div style={{ height: '300px', position: 'relative' }}>
                <Bar data={timeSpentData} options={barChartOptions} />
              </div>
            </div>
          </div>

          {/* Attendance Trend Chart */}
          <div className="column is-8">
            <div className="box">
              <h3 className="title is-5 mb-4">Attendance Trend</h3>
              <div style={{ height: '400px', position: 'relative' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="column is-4">
            <div className="box">
              <h3 className="title is-5 mb-4">Today's Snapshot</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {todaySnapshot.length === 0 ? (
                  <p className="has-text-grey">No check-ins today</p>
                ) : (
                  <div className="content">
                    {todaySnapshot.map((emp) => (
                      <div key={emp.id} className="mb-3 p-3 has-background-light" style={{ borderRadius: '6px' }}>
                        <div className="is-flex is-justify-content-space-between is-align-items-center">
                          <div>
                            <p className="has-text-weight-semibold is-size-7">{emp.full_name}</p>
                            <p className="is-size-7 has-text-grey">
                              {emp.lastIn ? `In: ${emp.lastIn}` : 'Not checked in'}
                            </p>
                          </div>
                          <div className="has-text-right">
                            <span className={`tag is-${emp.mode === 'office' ? 'primary' : 'link'} is-light is-small`}>
                              {emp.mode}
                            </span>
                            {emp.open && (
                              <span className="tag is-danger is-light is-small ml-1">Active</span>
                            )}
                          </div>
                        </div>
                        {emp.workedHours !== '0h 0m' && (
                          <p className="is-size-7 has-text-info mt-1">
                            Worked: {emp.workedHours}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics Table */}
        <div className="box mt-5">
          <h3 className="title is-5 mb-4">Individual User Statistics</h3>
          <div className="table-container">
            <table className="table is-striped is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Days Worked</th>
                  <th>Office Hours</th>
                  <th>Remote Hours</th>
                  <th>Total Hours</th>
                  <th>Office %</th>
                  <th>Remote %</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((user) => {
                  const totalMinutes = user.officeMinutes + user.remoteMinutes;
                  const officePercentage = totalMinutes > 0 ? Math.round((user.officeMinutes / totalMinutes) * 100) : 0;
                  const remotePercentage = totalMinutes > 0 ? Math.round((user.remoteMinutes / totalMinutes) * 100) : 0;
                  
                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.full_name}</strong>
                      </td>
                      <td>
                        <span className="tag is-info is-light">{user.daysWorked}</span>
                      </td>
                      <td>
                        <span className="tag is-primary is-light">{user.officeHours}h</span>
                      </td>
                      <td>
                        <span className="tag is-link is-light">{user.remoteHours}h</span>
                      </td>
                      <td>
                        <span className="tag is-success is-light">{user.totalHours}h</span>
                      </td>
                      <td>
                        <span className="tag is-primary is-light">{officePercentage}%</span>
                      </td>
                      <td>
                        <span className="tag is-link is-light">{remotePercentage}%</span>
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
