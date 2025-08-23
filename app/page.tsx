"use client";
import { useEffect, useState, useRef } from 'react';
import { LogOut } from 'lucide-react';

// Helper function to format IST times consistently
const formatISTTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  }
};

const formatISTTimeShort = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
};

// Helper to format time consistently for display
const formatDisplayTime = (timeString: string) => {
  if (!timeString) return 'N/A';
  if (timeString.includes(':')) return timeString; // Already formatted
  return formatISTTimeShort(timeString);
};

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNameInput, setShowNameInput] = useState(true);
  const [location, setLocation] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'snapshot'>('control');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [aiNotification, setAiNotification] = useState<string>('');
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [moodComment, setMoodComment] = useState<string>('');

  // Hold button state
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Hold button handlers
  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldProgress(0);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }

    // Start AI response generation when hold begins
    if (holdProgress === 0) {
      const context = hasOpen 
        ? `User is about to check out. Current session: ${me?.workedMinutes || 0} minutes worked.`
        : `User is about to check in. Mode: ${mode}.`;
      
      generateSmartNotification(context);
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
  }, [isHolding, hasOpen, mode, holdProgress, me?.workedMinutes]);



  // Generate AI-powered smart notification
  const generateSmartNotification = async (context: string) => {
    if (!me) return;
    
    try {
      const response = await fetch('/api/ai/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userData: me,
          context 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiNotification(data.notification);
        // Don't auto-clear AI notifications - let user see them
      }
    } catch (error) {
      // Silently fail - AI notifications are optional
    }
  };

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
      console.log('=== SESSION RESTORE DEBUG ===');
      console.log('Restored savedName from localStorage:', savedName);
      
      // Try to get the slug from localStorage
      const savedSlug = localStorage.getItem('userSlug');
      console.log('Restored savedSlug from localStorage:', savedSlug);
      
      setName(savedName);
      setIsLoggedIn(true);
      setShowNameInput(false);
      
      // If we have a slug, try to reconstruct the selectedEmployee object and check session
      if (savedSlug) {
        setSelectedEmployee({
          full_name: savedName,
          slug: savedSlug
        });
        // Check if there's an open session
        checkSessionStatus(savedSlug);
        fetchMySummary(savedSlug, true);
      } else {
        // No slug available, use full name
        fetchMySummary(savedName, false);
      }
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
        // Check if user is in the office (exact coordinates)
        // Office coordinates: 28.44388735° N, 77.05672206834356° E
        const officeLat = 28.44388735;
        const officeLng = 77.05672206834356;
        const radius = 0.01; // ~1km radius

        const distance = Math.sqrt(
          Math.pow(latitude - officeLat, 2) + Math.pow(longitude - officeLng, 2)
        );

        if (distance <= radius) {
          setMode('office');
          setLocation('Office Location');
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

  // Hold progress effect with AI initiation
  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }

    // Start AI response generation when hold begins
    if (holdProgress === 0) {
      const context = hasOpen 
        ? `User is about to check out. Current session: ${me?.workedMinutes || 0} minutes worked.`
        : `User is about to check in. Mode: ${mode}.`;
      
      generateSmartNotification(context);
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
  }, [isHolding, hasOpen, mode, holdProgress, me?.workedMinutes]);

  const checkSessionStatus = async (slug: string) => {
    try {
      console.log('=== SESSION STATUS DEBUG ===');
      console.log('Checking session status for slug:', slug);
      
      const r = await fetch(`/api/session/open?slug=${slug}`);
      const data = await r.json();
      
      console.log('Session status response:', data);
      
      if (data.ok && data.session) {
        setCurrentSession(data);
        setHasOpen(true);
        console.log('Found open session:', data.session);
      } else {
        setHasOpen(false);
        setCurrentSession(null);
        console.log('No open session found');
      }
    } catch (e) {
      console.error('Error checking session status:', e);
      setHasOpen(false);
      setCurrentSession(null);
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

  const fetchMySummary = async (identifier: string, useSlug: boolean = false) => {
    try {
      console.log('=== FETCH SUMMARY DEBUG ===');
      console.log('Identifier:', identifier);
      console.log('Use slug:', useSlug);
      
      // Auto-detect if identifier looks like a slug (contains hyphens, lowercase)
      const looksLikeSlug = identifier.includes('-') && identifier === identifier.toLowerCase();
      const shouldUseSlug = useSlug || looksLikeSlug;
      
      console.log('Identifier looks like slug:', looksLikeSlug);
      console.log('Should use slug:', shouldUseSlug);
      
      const param = shouldUseSlug ? `slug=${identifier}` : `fullName=${encodeURIComponent(identifier)}`;
      console.log('API URL param:', param);
      
      const r = await fetch(`/api/summary/me?${param}`);
      console.log('Response status:', r.status);
      
      if (!r.ok) {
        console.log('Response not ok, status:', r.status);
        return;
      }
      
      const data = await r.json();
      console.log('Summary data:', data);
      setMe(data);
    } catch (e) {
      console.error('Error fetching my summary:', e);
    }
  };

  const fetchTodaySummary = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const r = await fetch(`/api/today/summary?t=${timestamp}`);
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

  const act = async (checkMode: 'office' | 'remote') => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setMsg('');
    
    // First check if there's already an open session
    if (hasOpen && currentSession) {
      setMsg('You already have an open session. Please check out first.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log('=== CHECKIN DEBUG ===');
      console.log('Sending checkin request with:', { fullName: name, mode: checkMode });
      console.log('Name variable value:', name);
      console.log('Selected employee:', selectedEmployee);
      
      // Get slug from localStorage if selectedEmployee is null
      const storedSlug = localStorage.getItem('userSlug');
      console.log('Stored slug from localStorage:', storedSlug);
      
      // Use slug for checkin if available, otherwise use full name
      const checkinData = (selectedEmployee?.slug || storedSlug)
        ? { slug: selectedEmployee?.slug || storedSlug, mode: checkMode }
        : { fullName: name, mode: checkMode };
      
      console.log('Final checkin data:', checkinData);
      
      const r = await fetch('/api/checkin', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(checkinData) 
      });
      const j = await r.json();
      
      if (r.ok) {
        // Store session in localStorage
        localStorage.setItem('currentSession', JSON.stringify(j));
        setCurrentSession(j);
        setHasOpen(true);
        
        if (j.message && j.message.includes('already exists')) {
          // Existing session
          const message = `You already have an open session from ${formatISTTimeShort(j.session.checkin_ts)}`;
          setMsg(message);
        } else {
          // New session
          const message = `Checked in at ${formatISTTimeShort(j.session.checkin_ts)}`;
          setMsg(message);
          
          // Trigger AI notification for check-in
          setTimeout(() => {
            generateSmartNotification(`User just checked in and is working in ${checkMode} mode`);
          }, 1000);
        }
        
        fetchMySummary(j.employee.slug);
        fetchTodaySummary();
      } else {
        if (j.error && j.error.includes('unique constraint')) {
          setMsg('You already have an open session. Please check out first.');
          // Refresh session status
          if (selectedEmployee) {
            checkSessionStatus(selectedEmployee.slug);
          }
        } else {
          setMsg(j.error || 'Error');
        }
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const checkout = async () => {
    if (!currentSession) return;
    
    // Show mood check before checkout
    setShowMoodCheck(true);
  };

  const handleMoodSubmit = async () => {
    setIsSubmitting(true);
    setMsg('');
    
    try {
      const r = await fetch('/api/checkout', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          slug: currentSession.employee.slug,
          mood: selectedMood,
          moodComment: moodComment
        }) 
      });
      const j = await r.json();
      
      if (r.ok) {
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setHasOpen(false);
        setElapsedTime(0);
        setShowMoodCheck(false);
        setSelectedMood('');
        setMoodComment('');
        
        // AI notification already initiated during hold
        
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
      fetchMySummary(selectedEmployee.slug, true);
    }
  };

  const handleEmployeeSelect = (employee: any) => {
    console.log('=== EMPLOYEE SELECT DEBUG ===');
    console.log('Selected employee:', employee);
    console.log('Full name:', employee.full_name);
    console.log('Slug:', employee.slug);
    
    setName(employee.full_name);
    setSelectedEmployee(employee);
    setSuggestions([]);
    // Auto-submit when employee is selected
    setTimeout(() => {
      localStorage.setItem('userName', employee.full_name);
      localStorage.setItem('userSlug', employee.slug); // Store slug separately
      console.log('Stored in localStorage:', employee.full_name);
      console.log('Stored slug in localStorage:', employee.slug);
      setIsLoggedIn(true);
      setShowNameInput(false);
      fetchMySummary(employee.slug, true); // Use slug for API calls
    }, 100);
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

  // Format current time and date in IST
  const timeString = currentTime.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  const dateString = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto">
        {/* INSYDE Logo */}
        <div className="text-center mb-8 slide-up">
          <img 
            src="/insyde-logo.png" 
            alt="INSYDE" 
            className="h-12 md:h-16 mx-auto"
            style={{ maxWidth: '200px', width: 'auto', height: 'auto' }}
          />
        </div>
        
        {showNameInput ? (
          // Name Input Screen
          <div className="bg-white rounded-2xl shadow-lg p-8 slide-up">
            
            <div className="space-y-6">
              <div>
                <input
                  type="text"
                  className={`w-full px-4 py-4 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-purple-500 ${selectedEmployee ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
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
              

            </div>
          </div>
        ) : (
          // Main App with Tabs
          <div className="bg-white rounded-2xl shadow-lg slide-up">
            {/* Welcome Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Hi, {name.split(' ')[0]}! 👋</h2>
            </div>

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
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
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
                      {/* Full-width Hold Button */}
                      <div className="w-full px-4">
                        <button
                          className={`w-full h-16 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl select-none relative overflow-hidden ${
                            isHolding ? 'scale-105' : 'hover:scale-102'
                          }`}
                          style={{
                            background: holdProgress > 0 
                              ? `linear-gradient(90deg, ${hasOpen ? '#dc2626' : '#16a34a'} ${holdProgress}%, ${hasOpen ? '#b91c1c' : '#15803d'} ${holdProgress}%)`
                              : `linear-gradient(135deg, ${hasOpen ? '#dc2626' : '#16a34a'}, ${hasOpen ? '#b91c1c' : '#15803d'})`,
                            boxShadow: holdProgress > 0 ? `0 0 20px rgba(${hasOpen ? '220, 38, 38' : '22, 163, 74'}, 0.4)` : '0 10px 25px rgba(0,0,0,0.1)'
                          }}
                          onMouseDown={handleHoldStart}
                          onMouseUp={handleHoldEnd}
                          onMouseLeave={handleHoldEnd}
                          onTouchStart={handleHoldStart}
                          onTouchEnd={handleHoldEnd}
                        >
                          <div className="text-white text-center select-none flex items-center space-x-3">
                            <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} text-2xl`}></i>
                            <span className="font-semibold text-lg">
                              {hasOpen ? 'Clock Out' : 'Clock In'}
                            </span>
                          </div>
                        </button>
                        {holdProgress > 0 && (
                          <p className="text-sm text-gray-600 text-center mt-2">
                            Hold to confirm ({Math.round(holdProgress)}%)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mood Check-in Modal */}
                  {showMoodCheck && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">How was your day?</h3>
                        
                        <div className="grid grid-cols-5 gap-3 mb-4">
                          {[
                            { emoji: '😊', value: 'great' },
                            { emoji: '🙂', value: 'good' },
                            { emoji: '😞', value: 'challenging' },
                            { emoji: '😴', value: 'exhausted' },
                            { emoji: '🚀', value: 'productive' }
                          ].map((mood) => (
                            <button
                              key={mood.value}
                              onClick={() => setSelectedMood(mood.value)}
                              className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                                selectedMood === mood.value
                                  ? 'border-purple-500 bg-purple-50 scale-110'
                                  : 'border-gray-200 hover:border-purple-300 hover:scale-105'
                              }`}
                            >
                              <div className="text-2xl">{mood.emoji}</div>
                            </button>
                          ))}
                        </div>
                        
                        {selectedMood && (
                          <div className="mb-4">
                            <textarea
                              placeholder="Any highlights or challenges today? (optional)"
                              value={moodComment}
                              onChange={(e) => setMoodComment(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none"
                              rows={3}
                            />
                          </div>
                        )}
                        
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowMoodCheck(false);
                              setSelectedMood('');
                              setMoodComment('');
                            }}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleMoodSubmit}
                            disabled={!selectedMood || isSubmitting}
                            className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200"
                          >
                            {isSubmitting ? 'Checking out...' : 'Check Out'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Output Display */}
                  {(aiNotification || msg) && (
                    <div className="text-left">
                      <div className="text-sm text-black bg-gray-100 rounded-md p-3 min-h-[60px] relative">
                        {aiNotification ? (
                          <div>
                            <div className="font-medium mb-1 text-gray-800 flex justify-between items-center">
                              <span>✨</span>
                              <button 
                                onClick={() => setAiNotification('')}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="text-gray-900">{aiNotification}</div>
                          </div>
                        ) : (
                          <div className="text-gray-900">{msg}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {me && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="notion-badge notion-badge-info">
                        Last In: {formatDisplayTime(me.lastIn)}
                      </span>
                      <span className="notion-badge notion-badge-outline">
                        Last Out: {formatDisplayTime(me.lastOut)}
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


