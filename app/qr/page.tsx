"use client";
import { useEffect, useState } from 'react';
import { hhmmIST } from '@/lib/time';

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

export default function QRPage() {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState<'office' | 'remote'>('office');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [hasOpen, setHasOpen] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [showNameInput, setShowNameInput] = useState(true);

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

  // Check session status
  const checkSessionStatus = async (slug: string) => {
    try {
      const r = await fetch(`/api/session/open?slug=${slug}`);
      const data = await r.json();
      
      if (data.ok && data.session) {
        setCurrentSession(data);
        setHasOpen(true);
      } else {
        setHasOpen(false);
        setCurrentSession(null);
      }
    } catch (e) {
      console.error('Error checking session status:', e);
      setHasOpen(false);
      setCurrentSession(null);
    }
  };

  // Search employees
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

  // Handle employee selection
  const handleEmployeeSelect = (employee: any) => {
    setName(employee.full_name);
    setSelectedEmployee(employee);
    setSuggestions([]);
    
    // Auto-submit when employee is selected
    setTimeout(() => {
      localStorage.setItem('userName', employee.full_name);
      localStorage.setItem('userSlug', employee.slug);
      setIsLoggedIn(true);
      setShowNameInput(false);
      checkSessionStatus(employee.slug);
    }, 100);
  };

  // Handle name change
  const handleNameChange = (value: string) => {
    setName(value);
    setSelectedEmployee(null);
    searchEmployees(value);
  };

  // Check-in action
  const act = async (checkMode: 'office' | 'remote') => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    setMsg('');
    
    try {
      const r = await fetch('/api/checkin', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ slug: selectedEmployee.slug, mode: checkMode }) 
      });
      const j = await r.json();
      
      if (r.ok) {
        setCurrentSession(j);
        setHasOpen(true);
        const message = `Checked in at ${formatISTTimeShort(j.session.checkin_ts)}`;
        setMsg(message);
      } else {
        if (j.error && j.error.includes('unique constraint')) {
          setMsg('You already have an open session. Please check out first.');
          checkSessionStatus(selectedEmployee.slug);
        } else {
          setMsg(j.error || 'Error');
        }
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  // Check-out action
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
        setCurrentSession(null);
        setHasOpen(false);
        const message = `Checked out at ${formatISTTimeShort(j.checkout_ts)}`;
        setMsg(message);
      } else {
        setMsg(j.error || 'Error');
        checkSessionStatus(currentSession.employee.slug);
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userSlug');
    setCurrentSession(null);
    setHasOpen(false);
    setName('');
    setSelectedEmployee(null);
    setIsLoggedIn(false);
    setShowNameInput(true);
    setMsg('');
  };

  // Initialize on mount
  useEffect(() => {
    const savedMode = (typeof window !== 'undefined' ? (localStorage.getItem('mode') as any) : null) || 'office';
    setMode(savedMode);
    
    // Check for existing user
    const savedName = localStorage.getItem('userName');
    const savedSlug = localStorage.getItem('userSlug');
    
    if (savedName && savedSlug) {
      setName(savedName);
      setSelectedEmployee({
        full_name: savedName,
        slug: savedSlug
      });
      setIsLoggedIn(true);
      setShowNameInput(false);
      checkSessionStatus(savedSlug);
    }
    
    setIsLoading(false);
    getCurrentLocation();
  }, []);

  // Save mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mode', mode);
    }
  }, [mode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* INSYDE Logo */}
        <div className="text-center mb-6">
          <h1 className="font-cal-sans text-3xl font-semibold text-purple-600 tracking-tight">
            insyde
          </h1>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {showNameInput ? (
            // Employee Search Screen
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center text-gray-800 mb-4">
                Quick Check-in
              </h2>
              
              <div>
                <input
                  type="text"
                  className={`w-full px-4 py-4 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-purple-500 ${selectedEmployee ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
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
          ) : (
            // Main Check-in/out Screen
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Hi, {name ? name.split(' ')[0] : 'there'}! 👋
                </h2>
                <p className="text-sm text-gray-600">
                  {hasOpen && currentSession?.session?.checkin_ts ? (
                    `Checked in at ${formatISTTimeShort(currentSession.session.checkin_ts)}`
                  ) : (
                    'Ready to check in'
                  )}
                </p>
              </div>

              {/* Location Tag */}
              <div className="text-center">
                {isLocationLoading ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                    Detecting location...
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
                    <i className={`fas ${mode === 'office' ? 'fa-building' : 'fa-home'} mr-2`}></i>
                    {location}
                  </span>
                )}
              </div>

              {/* Mode Selection */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Work mode:</p>
                <div className="flex gap-2 justify-center">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      mode === 'office'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setMode('office')}
                  >
                    Office
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      mode === 'remote'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setMode('remote')}
                  >
                    Remote
                  </button>
                </div>
              </div>

              {/* Main Action Button */}
              <div className="text-center">
                <button
                  className={`w-full h-16 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl ${
                    hasOpen 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  onClick={hasOpen ? checkout : () => act(mode)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {hasOpen ? 'Checking out...' : 'Checking in...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} mr-2`}></i>
                      {hasOpen ? 'Check Out' : 'Check In'}
                    </div>
                  )}
                </button>
              </div>

              {/* Status Message */}
              {msg && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 bg-gray-100 rounded-md p-3">
                    {msg}
                  </p>
                </div>
              )}

              {/* Logout Button */}
              <div className="text-center">
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Switch User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
