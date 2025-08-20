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
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

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
    if (name.trim() && selectedEmployee) {
      // Only allow submission if a valid employee is selected
      localStorage.setItem('userName', selectedEmployee.full_name);
      setIsLoggedIn(true);
      setShowNameInput(false);
      fetchMySummary(selectedEmployee.full_name);
    }
  };

  const handleEmployeeSelect = (employee: any) => {
    setName(employee.full_name);
    setSelectedEmployee(employee);
    setSuggestions([]);
    // Don't auto-submit, let user click Continue
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSelectedEmployee(null); // Clear selection when user types
    searchEmployees(value);
  };

  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('userName');
    setCurrentSession(null);
    setHasOpen(false);
    setElapsedTime(0);
    setName('');
    setSelectedEmployee(null);
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
        <div className="notion-card p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Current Time Display */}
        <div className="text-center mb-8 slide-up">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{timeString}</h1>
          <p className="text-gray-600">{dateString}</p>
        </div>
        
        {showNameInput ? (
          // Name Input Screen
          <div className="notion-card p-8 slide-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to TalkXO</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <input
                  type="text"
                  className={`notion-input text-center text-lg py-4 ${selectedEmployee ? 'border-green-500 bg-green-50' : ''}`}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => {
                    handleNameChange(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSubmit();
                    }
                  }}
                  autoFocus
                />
                {selectedEmployee && (
                  <p className="text-sm text-green-600 mt-3 text-center flex items-center justify-center">
                    <i className="fas fa-check-circle mr-2"></i>
                    Valid employee selected
                  </p>
                )}
              </div>
              
              {suggestions.length > 0 && (
                <div className="relative">
                  <div className="absolute z-10 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.id}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors text-sm"
                        onClick={() => handleEmployeeSelect(emp)}
                      >
                        {emp.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                className="notion-button-primary w-full py-4 text-lg"
                onClick={handleNameSubmit}
                disabled={!name.trim() || !selectedEmployee}
              >
                {selectedEmployee ? 'Continue with ' + selectedEmployee.full_name : 'Select a valid employee'}
              </button>
            </div>
          </div>
        ) : (
          // Main App with Tabs
          <div className="notion-card slide-up">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                className={`notion-tab ${activeTab === 'control' ? 'notion-tab-active' : 'notion-tab-inactive'}`}
                onClick={() => setActiveTab('control')}
              >
                <i className="fas fa-user mr-2"></i>
                My Control
              </button>
              <button
                className={`notion-tab ${activeTab === 'snapshot' ? 'notion-tab-active' : 'notion-tab-inactive'}`}
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
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{name}</p>
                        <p className="text-sm text-gray-600">
                          {hasOpen ? 'Currently checked in' : 'Ready to check in'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location Tag */}
                  <div className="text-center">
                    {isLocationLoading ? (
                      <span className="notion-badge notion-badge-outline">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Detecting location...
                      </span>
                    ) : (
                      <span className="notion-badge notion-badge-outline">
                        <i className={`fas ${mode === 'office' ? 'fa-building' : 'fa-home'} mr-2`}></i>
                        {location}
                      </span>
                    )}
                  </div>

                  {/* Large Action Button */}
                  <div className="text-center">
                    <div className="space-y-4">
                      <div 
                        className="w-32 h-32 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl"
                        style={{
                          background: holdProgress > 0 
                            ? `conic-gradient(from 0deg, ${hasOpen ? '#dc2626' : '#16a34a'} ${holdProgress * 3.6}deg, #f3f4f6 ${holdProgress * 3.6}deg)`
                            : `linear-gradient(135deg, ${hasOpen ? '#dc2626' : '#16a34a'}, ${hasOpen ? '#b91c1c' : '#15803d'})`,
                          boxShadow: holdProgress > 0 ? `0 0 20px rgba(${hasOpen ? '220, 38, 38' : '22, 163, 74'}, 0.4)` : '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                        onMouseDown={handleHoldStart}
                        onMouseUp={handleHoldEnd}
                        onMouseLeave={handleHoldEnd}
                        onTouchStart={handleHoldStart}
                        onTouchEnd={handleHoldEnd}
                      >
                        <div className="text-white text-center">
                          <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} text-2xl mb-2`}></i>
                          <p className="font-semibold text-sm">
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
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">
                        {msg}
                      </p>
                    </div>
                  )}

                  {me && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="notion-badge notion-badge-info">
                        Last In: {me.lastIn ? new Date(me.lastIn).toLocaleTimeString() : 'N/A'}
                      </span>
                      <span className="notion-badge notion-badge-outline">
                        Last Out: {me.lastOut ? new Date(me.lastOut).toLocaleTimeString() : 'N/A'}
                      </span>
                      <span className="notion-badge notion-badge-success">
                        Worked: {me.workedMinutes}m
                      </span>
                      <span className="notion-badge notion-badge-primary">
                        Mode: {me.mode || 'N/A'}
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
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">In</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Out</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Hours</th>
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todaySummary.map((emp: any) => (
                            <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 font-medium text-gray-900 text-sm">{emp.full_name}</td>
                              <td className="px-3 py-2">
                                {emp.lastIn ? (
                                  <span className="notion-badge notion-badge-success text-xs">
                                    {emp.lastIn}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {emp.lastOut ? (
                                  <span className="notion-badge notion-badge-outline text-xs">
                                    {emp.lastOut}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className="notion-badge notion-badge-info text-xs">
                                  {emp.workedHours}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {emp.open ? (
                                  <span className="notion-badge notion-badge-danger text-xs">
                                    Active
                                  </span>
                                ) : emp.lastIn ? (
                                  <span className="notion-badge notion-badge-success text-xs">
                                    Complete
                                  </span>
                                ) : (
                                  <span className="notion-badge notion-badge-outline text-xs">
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
          <div className="mt-6 text-center slide-up">
            <button 
              className="notion-button-secondary"
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


