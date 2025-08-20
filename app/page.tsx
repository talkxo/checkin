"use client";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  useEffect(()=>{
    const saved = (typeof window!== 'undefined' ? (localStorage.getItem('mode') as any) : null) || 'office';
    setMode(saved);
    // Check for existing session
    const session = localStorage.getItem('currentSession');
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        setCurrentSession(sessionData);
        setName(sessionData.employee.full_name);
        setShowNameInput(false);
        // Check if session is still open
        checkSessionStatus(sessionData.employee.slug);
      } catch (e) {
        localStorage.removeItem('currentSession');
      }
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

  // Timer effect for elapsed time
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
        // Session closed, clear from localStorage
        localStorage.removeItem('currentSession');
        setCurrentSession(null);
        setElapsedTime(0);
      }
    } catch (e) {
      console.error('Error checking session status:', e);
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

  // Format elapsed time as HH:MM:SS
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
    const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: name, mode: checkMode }) });
    const j = await r.json();
    if (r.ok) {
      // Store session in localStorage
      localStorage.setItem('currentSession', JSON.stringify(j));
      setCurrentSession(j);
      setHasOpen(true);
      setShowNameInput(false);
      const message = `Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`;
      setMsg(message);
      fetchMySummary(j.employee.slug);
      fetchTodaySummary();
    } else {
      setMsg(j.error || 'Error');
    }
    setIsSubmitting(false);
  };

  const checkout = async () => {
    if (!currentSession) return;
    setIsSubmitting(true);
    setMsg('');
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: currentSession.employee.slug }) });
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
    setIsSubmitting(false);
  };

  const handleNameSubmit = () => {
    if (name.trim()) {
      setShowNameInput(false);
      fetchMySummary(name);
    }
  };

  useEffect(()=>{ if(typeof window!== 'undefined') localStorage.setItem('mode', mode); },[mode]);
  useEffect(()=>{ fetchTodaySummary(); },[]);
  useEffect(()=>{ if(me) fetchMySummary(me.slug); },[me]);
  useEffect(()=>{ if(currentSession) checkSessionStatus(currentSession.employee.slug); },[currentSession]);

  // Format current time and date
  const timeString = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateString = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Current Time Display */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-foreground mb-2">{timeString}</h1>
          <p className="text-muted-foreground">{dateString}</p>
        </div>
        
        {showNameInput ? (
          // Name Input Screen
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Welcome to TalkXO Check-in</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Enter your name</label>
                <Input
                  type="text"
                  placeholder="Type your name"
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
                  <div className="absolute z-10 w-full bg-background border border-border rounded-lg shadow-lg">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.id}
                        className="w-full text-left px-4 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
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
              <Button 
                className="w-full"
                onClick={handleNameSubmit}
                disabled={!name.trim()}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Main Check-in/out Screen
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* User Profile Header */}
              {currentSession && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {currentSession.employee.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{currentSession.employee.full_name}</p>
                      <p className="text-sm text-muted-foreground">Ready to check in/out</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Tag */}
              <div className="text-center">
                {isLocationLoading ? (
                  <Badge variant="secondary">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Detecting location...
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <i className={`fas ${mode === 'office' ? 'fa-building' : 'fa-home'} mr-2`}></i>
                    {location}
                  </Badge>
                )}
              </div>

              {/* Large Action Button */}
              <div className="text-center">
                <div className="space-y-4">
                  <div 
                    className="w-32 h-32 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl"
                    style={{
                      background: holdProgress > 0 
                        ? `conic-gradient(from 0deg, ${hasOpen ? '#ef4444' : '#22c55e'} ${holdProgress * 3.6}deg, #f3f4f6 ${holdProgress * 3.6}deg)`
                        : `linear-gradient(135deg, ${hasOpen ? '#ef4444' : '#22c55e'}, ${hasOpen ? '#dc2626' : '#16a34a'})`,
                      boxShadow: holdProgress > 0 ? `0 0 20px rgba(${hasOpen ? '239, 68, 68' : '34, 197, 94'}, 0.5)` : '0 10px 25px rgba(0,0,0,0.15)'
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
                    <p className="text-sm text-muted-foreground">Hold to confirm ({Math.round(holdProgress)}%)</p>
                  )}
                </div>
              </div>

              {/* Session Timer */}
              {hasOpen && currentSession && (
                <div className="text-center">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Session started at {new Date(currentSession.session.checkin_ts).toLocaleTimeString()}
                    </p>
                    <p className="text-3xl font-bold text-green-600">{formatTime(elapsedTime)}</p>
                    <p className="text-sm text-muted-foreground">Elapsed time</p>
                  </div>
                </div>
              )}

              {msg && (
                <p className="text-center text-sm text-muted-foreground">
                  {msg}
                </p>
              )}

              {me && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="secondary">
                    Last In: {me.lastIn ? new Date(me.lastIn).toLocaleTimeString() : 'N/A'}
                  </Badge>
                  <Badge variant="outline">
                    Last Out: {me.lastOut ? new Date(me.lastOut).toLocaleTimeString() : 'N/A'}
                  </Badge>
                  <Badge variant="default">
                    Worked: {me.workedMinutes}m
                  </Badge>
                  <Badge variant="secondary">
                    Mode: {me.mode}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Snapshot */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Today's Snapshot</h2>
          <Card>
            <CardContent className="p-0">
              {todaySummary.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground">No check-ins yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>In</TableHead>
                        <TableHead>Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySummary.map((emp: any) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.full_name}</TableCell>
                          <TableCell>
                            {emp.lastIn ? (
                              <Badge variant="default" className="text-xs">
                                {emp.lastIn}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {emp.lastOut ? (
                              <Badge variant="outline" className="text-xs">
                                {emp.lastOut}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {emp.workedHours}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {emp.mode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {emp.open ? (
                              <Badge variant="destructive" className="text-xs">
                                Active
                              </Badge>
                            ) : emp.lastIn ? (
                              <Badge variant="default" className="text-xs">
                                Complete
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Not Started
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


