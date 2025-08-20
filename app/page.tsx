"use client";
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';

export default function HomePage(){
  const [name,setName]=useState('');
  const [pending,setPending]=useState(false);
  const [msg,setMsg]=useState('');
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [hasOpen, setHasOpen] = useState(false);
  const [todaySummary, setTodaySummary] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNameInput, setShowNameInput] = useState(true);
  const [location, setLocation] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'snapshot'>('control');

  useEffect(()=>{
    const saved = (typeof window!== 'undefined' ? (localStorage.getItem('mode') as any) : null) || 'office';
    setMode(saved);
    
    // Check for existing session
    const session = localStorage.getItem('currentSession');
    const savedName = localStorage.getItem('userName');
    
    if (session && savedName) {
      try {
        const sessionData = JSON.parse(session);
        setCurrentSession(sessionData);
        setName(savedName);
        setIsLoggedIn(true);
        setShowNameInput(false);
        // Check if session is still open
        checkSessionStatus(sessionData.employee.slug);
      } catch (e) {
        localStorage.removeItem('currentSession');
        localStorage.removeItem('userName');
        setIsLoading(false);
      }
    } else if (savedName) {
      // User is logged in but no active session
      setName(savedName);
      setIsLoggedIn(true);
      setShowNameInput(false);
      fetchMySummary(savedName);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
    
    // Get location on app load
    getCurrentLocation();
  },[]);

  // Get current location and determine mode
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation('Location not available');
      return;
    }

    setIsLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Check if user is in Sector 39, Gurugram (approximate coordinates)
        // Sector 39, Gurugram is roughly at: 28.4595° N, 77.0266° E
        const officeLat = 28.4595;
        const officeLng = 77.0266;
        const radius = 0.01; // ~1km radius

        const distance = Math.sqrt(
          Math.pow(latitude - officeLat, 2) + Math.pow(longitude - officeLng, 2)
        );

        if (distance <= radius) {
          setMode('office');
          setLocation('Sector 39, Gurugram');
        } else {
          setMode('remote');
          setLocation('Remote Location');
        }
        setIsLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocation('Location unavailable');
        setMode('remote'); // Default to remote if location fails
        setIsLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer effect for elapsed time (hidden from UI but still tracked)
  useEffect(() => {
    if (!currentSession || !hasOpen) return;
    
    const interval = setInterval(() => {
      const startTime = new Date(currentSession.session.checkin_ts).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession, hasOpen]);

  // Hold progress effect
  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          setIsHolding(false);
          // Trigger the action when hold is complete
          if (hasOpen) {
            checkout();
          } else {
            act(mode);
          }
          return 100;
        }
        return prev + 2; // Complete in ~2.5 seconds
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHolding, hasOpen, mode]);

  const checkSessionStatus = async (slug: string) => {
    try {
      const r = await fetch(`/api/session/open?slug=${slug}`);
      const data = await r.json();
      setHasOpen(data.ok);
      if (!data.ok) {
        // Session closed, but keep user logged in
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setElapsedTime(0);
        // Don't show name input - user stays logged in
      } else {
        // Session is still open, fetch summary
        fetchMySummary(slug);
      }
      setIsLoading(false);
    } catch (e) {
      console.error('Error checking session status:', e);
      setIsLoading(false);
    }
  };

  const searchEmployees = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const r = await fetch(`/api/employees?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Error searching employees:', e);
      setSuggestions([]);
    }
  };

  const fetchMySummary = async (slug: string) => {
    try {
      const r = await fetch(`/api/summary/me?slug=${slug}`);
      if (!r.ok) return;
      const data = await r.json();
      setMe(data);
    } catch (e) {
      console.error('Error fetching my summary:', e);
    }
  };

  const fetchTodaySummary = async () => {
    try {
      const r = await fetch('/api/today/summary');
      if (!r.ok) return;
      const data = await r.json();
      setTodaySummary(data);
    } catch (e) {
      console.error('Error fetching today summary:', e);
    }
  };

  // Format elapsed time as HH:MM:SS (for internal use)
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldProgress(0);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldProgress(0);
  };

  const act = async (checkMode: 'office' | 'remote') => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setMsg('');
    
    try {
      const r = await fetch('/api/checkin', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fullName: name, mode: checkMode }) 
      });
      const j = await r.json();
      
      if (r.ok) {
        // Store session in localStorage
        localStorage.setItem('currentSession', JSON.stringify(j));
        setCurrentSession(j);
        setHasOpen(true);
        
        if (j.message && j.message.includes('already exists')) {
          // Existing session
          const message = `You already have an open session from ${new Date(j.session.checkin_ts).toLocaleTimeString()}`;
          setMsg(message);
        } else {
          // New session
          const message = `Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`;
          setMsg(message);
        }
        
        fetchMySummary(j.employee.slug);
        fetchTodaySummary();
      } else {
        setMsg(j.error || 'Error');
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const checkout = async () => {
    if (!currentSession) return;
    setIsSubmitting(true);
    setMsg('');
    
    try {
      const r = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ slug: currentSession.employee.slug }) 
      });
      const j = await r.json();
      
      if (r.ok) {
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setHasOpen(false);
        setElapsedTime(0);
        const message = `Checked out at ${new Date(j.checkout_ts).toLocaleTimeString()}`;
        setMsg(message);
        fetchTodaySummary();
      } else {
        setMsg(j.error || 'Error');
        // If checkout failed, recheck session status
        checkSessionStatus(currentSession.employee.slug);
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleNameSubmit = () => {
    if (name.trim()) {
      // Store user name for persistence
      localStorage.setItem('userName', name);
      setIsLoggedIn(true);
      setShowNameInput(false);
      fetchMySummary(name);
    }
  };

  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('userName');
    setCurrentSession(null);
    setHasOpen(false);
    setElapsedTime(0);
    setName('');
    setIsLoggedIn(false);
    setShowNameInput(true);
    setMe(null);
    setMsg('');
  };

  useEffect(()=>{ if(typeof window!== 'undefined') localStorage.setItem('mode', mode); },[mode]);
  useEffect(()=>{ fetchTodaySummary(); },[]);

  // Format current time and date
  const timeString = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateString = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="preline-card p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        {/* Current Time Display */}
        <div className="text-center mb-8 slide-up">
          <h1 className="text-6xl font-bold text-white mb-2 drop-shadow-lg">{timeString}</h1>
          <p className="text-white/90 text-lg">{dateString}</p>
        </div>
        
        {showNameInput ? (
          // Name Input Screen
          <div className="preline-card p-8 slide-up">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold gradient-text mb-2">Welcome to TalkXO</h2>
              <p className="text-gray-600">Enter your name to get started</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  className="preline-input"
                  placeholder="Type your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    searchEmployees(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSubmit();
                    }
                  }}
                  autoFocus
                />
              </div>
              
              {suggestions.length > 0 && (
                <div className="relative">
                  <div className="absolute z-10 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.id}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                        onClick={() => {
                          setName(emp.full_name);
                          setSuggestions([]);
                          handleNameSubmit();
                        }}
                      >
                        {emp.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                className="preline-button-primary w-full"
                onClick={handleNameSubmit}
                disabled={!name.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          // Main App with Tabs
          <div className="preline-card p-0 slide-up">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'control'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('control')}
              >
                <i className="fas fa-user mr-2"></i>
                My Control
              </button>
              <button
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'snapshot'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('snapshot')}
              >
                <i className="fas fa-chart-bar mr-2"></i>
                Snapshot
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'control' ? (
                // User Control Tab
                <div className="space-y-6">
                  {/* User Profile Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{name}</p>
                        <p className="text-sm text-gray-600">
                          {hasOpen ? 'Currently checked in' : 'Ready to check in'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location Tag */}
                  <div className="text-center">
                    {isLocationLoading ? (
                      <span className="preline-badge preline-badge-outline">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Detecting location...
                      </span>
                    ) : (
                      <span className="preline-badge preline-badge-outline">
                        <i className={`fas ${mode === 'office' ? 'fa-building' : 'fa-home'} mr-2`}></i>
                        {location}
                      </span>
                    )}
                  </div>

                  {/* Large Action Button */}
                  <div className="text-center">
                    <div className="space-y-4">
                      <div 
                        className="w-36 h-36 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-3xl"
                        style={{
                          background: holdProgress > 0 
                            ? `conic-gradient(from 0deg, ${hasOpen ? '#ef4444' : '#22c55e'} ${holdProgress * 3.6}deg, #f3f4f6 ${holdProgress * 3.6}deg)`
                            : `linear-gradient(135deg, ${hasOpen ? '#ef4444' : '#22c55e'}, ${hasOpen ? '#dc2626' : '#16a34a'})`,
                          boxShadow: holdProgress > 0 ? `0 0 30px rgba(${hasOpen ? '239, 68, 68' : '34, 197, 94'}, 0.6)` : '0 20px 40px rgba(0,0,0,0.2)'
                        }}
                        onMouseDown={handleHoldStart}
                        onMouseUp={handleHoldEnd}
                        onMouseLeave={handleHoldEnd}
                        onTouchStart={handleHoldStart}
                        onTouchEnd={handleHoldEnd}
                      >
                        <div className="text-white text-center">
                          <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} text-3xl mb-3`}></i>
                          <p className="font-bold text-lg">
                            {hasOpen ? 'Clock Out' : 'Clock In'}
                          </p>
                        </div>
                      </div>
                      {holdProgress > 0 && (
                        <p className="text-sm text-gray-600">Hold to confirm ({Math.round(holdProgress)}%)</p>
                      )}
                    </div>
                  </div>

                  {msg && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        {msg}
                      </p>
                    </div>
                  )}

                  {me && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="preline-badge preline-badge-info">
                        Last In: {me.lastIn ? new Date(me.lastIn).toLocaleTimeString() : 'N/A'}
                      </span>
                      <span className="preline-badge preline-badge-outline">
                        Last Out: {me.lastOut ? new Date(me.lastOut).toLocaleTimeString() : 'N/A'}
                      </span>
                      <span className="preline-badge preline-badge-success">
                        Worked: {me.workedMinutes}m
                      </span>
                      <span className="preline-badge preline-badge-primary">
                        Mode: {me.mode}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                // Snapshot Tab
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h3>
                  {todaySummary.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No check-ins yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">In</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Out</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hours</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todaySummary.map((emp: any) => (
                            <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900 text-sm">{emp.full_name}</td>
                              <td className="px-4 py-3">
                                {emp.lastIn ? (
                                  <span className="preline-badge preline-badge-success text-xs">
                                    {emp.lastIn}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {emp.lastOut ? (
                                  <span className="preline-badge preline-badge-outline text-xs">
                                    {emp.lastOut}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="preline-badge preline-badge-info text-xs">
                                  {emp.workedHours}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="preline-badge preline-badge-outline text-xs">
                                  {emp.mode}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {emp.open ? (
                                  <span className="preline-badge preline-badge-danger text-xs">
                                    Active
                                  </span>
                                ) : emp.lastIn ? (
                                  <span className="preline-badge preline-badge-success text-xs">
                                    Complete
                                  </span>
                                ) : (
                                  <span className="preline-badge preline-badge-outline text-xs">
                                    Not Started
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout Button */}
        {isLoggedIn && (
          <div className="mt-8 text-center slide-up">
            <button 
              className="preline-button-secondary"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


