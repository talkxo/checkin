"use client";
import { useEffect, useState } from 'react';

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
  },[]);

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
            act('office');
          }
          return 100;
        }
        return prev + 2; // Complete in ~2.5 seconds
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHolding, hasOpen]);

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
      setMsg(`Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`);
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
      setMsg(`Checked out at ${new Date(j.checkout_ts).toLocaleTimeString()}`);
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

  const resetSession = () => {
    localStorage.removeItem('currentSession');
    setCurrentSession(null);
    setName('');
    setHasOpen(false);
    setElapsedTime(0);
    setShowNameInput(true);
    setMsg('');
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
    <main className="container-narrow section">
      {/* Current Time Display */}
      <div className="has-text-centered mb-5">
        <h1 className="title is-1 has-text-weight-bold mb-2">{timeString}</h1>
        <p className="has-text-grey">{dateString}</p>
      </div>
      
      {showNameInput ? (
        // Name Input Screen
        <div className="box">
          <h2 className="title is-4 has-text-centered mb-4">Welcome to TalkXO Check-in</h2>
          <div className="field">
            <label className="label">Enter your name</label>
            <div className="control">
              <input
                type="text"
                className="input is-medium"
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
              <div className="dropdown is-active" style={{position: 'absolute', zIndex: 10, width: '100%'}}>
                <div className="dropdown-menu">
                  <div className="dropdown-content">
                    {suggestions.map((emp) => (
                      <a
                        key={emp.id}
                        className="dropdown-item"
                        onClick={() => {
                          setName(emp.full_name);
                          setSuggestions([]);
                          handleNameSubmit();
                        }}
                      >
                        {emp.full_name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="buttons is-centered">
            <button 
              className="button is-primary is-medium" 
              onClick={handleNameSubmit}
              disabled={!name.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        // Main Check-in/out Screen
        <div className="box">
          {/* User Profile Header */}
          {currentSession && (
            <div className="level mb-4">
              <div className="level-left">
                <div className="level-item">
                  <div className="has-text-left">
                    <div className="is-flex is-align-items-center">
                      <div className="mr-3">
                        <div className="image is-48x48">
                          <div className="is-rounded has-background-primary has-text-white is-flex is-align-items-center is-justify-content-center" style={{width: '48px', height: '48px'}}>
                            <span className="has-text-weight-bold">{currentSession.employee.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="has-text-weight-semibold">{currentSession.employee.full_name}</p>
                        <p className="has-text-grey is-size-7">Ready to check in/out</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <button className="button is-small is-light" onClick={resetSession}>
                    <span className="icon">
                      <i className="fas fa-sign-out-alt"></i>
                    </span>
                    <span>Switch User</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode Toggle - Only show if not in session */}
          {!hasOpen && (
            <div className="field mb-4">
              <label className="label">Work Mode</label>
              <div className="buttons has-addons">
                <button 
                  className={`button ${mode==='office'?'is-primary':'is-light'}`} 
                  onClick={()=>setMode('office')}
                  style={{transition: 'all 0.2s ease'}}
                >
                  <span className="icon">
                    <i className="fas fa-building"></i>
                  </span>
                  <span>Office</span>
                </button>
                <button 
                  className={`button ${mode==='remote'?'is-link':'is-light'}`} 
                  onClick={()=>setMode('remote')}
                  style={{transition: 'all 0.2s ease'}}
                >
                  <span className="icon">
                    <i className="fas fa-home"></i>
                  </span>
                  <span>Remote</span>
                </button>
              </div>
            </div>
          )}

          {/* Large Action Button */}
          <div className="has-text-centered">
            <div className="mb-4">
              <div 
                className="is-clickable"
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  margin: '0 auto',
                  background: holdProgress > 0 
                    ? `conic-gradient(from 0deg, ${hasOpen ? '#f14668' : '#48c774'} ${holdProgress * 3.6}deg, #f5f5f5 ${holdProgress * 3.6}deg)`
                    : `linear-gradient(135deg, ${hasOpen ? '#f14668' : '#48c774'}, ${hasOpen ? '#ff3860' : '#00d1b2'})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: holdProgress > 0 ? `0 0 20px rgba(${hasOpen ? '241, 70, 104' : '72, 199, 116'}, 0.5)` : '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
              >
                <div className="has-text-white has-text-centered">
                  <span className="icon is-large">
                    <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'}`}></i>
                  </span>
                  <p className="has-text-weight-semibold mt-2">
                    {hasOpen ? 'Clock Out' : 'Clock In'}
                  </p>
                </div>
              </div>
              {holdProgress > 0 && (
                <p className="has-text-grey is-size-7 mt-2">Hold to confirm ({Math.round(holdProgress)}%)</p>
              )}
            </div>
          </div>

          {/* Session Timer */}
          {hasOpen && currentSession && (
            <div className="has-text-centered mb-4">
              <p className="has-text-grey">Session started at {new Date(currentSession.session.checkin_ts).toLocaleTimeString()}</p>
              <p className="title is-3 has-text-primary">{formatTime(elapsedTime)}</p>
              <p className="has-text-grey-light">Elapsed time</p>
            </div>
          )}

          {msg && <p className="mt-3 has-text-centered">{msg}</p>}

          {me && (
            <div className="tags is-centered">
              <span className="tag is-info is-light">Last In: {me.lastIn ? new Date(me.lastIn).toLocaleTimeString() : 'N/A'}</span>
              <span className="tag is-warning is-light">Last Out: {me.lastOut ? new Date(me.lastOut).toLocaleTimeString() : 'N/A'}</span>
              <span className="tag is-success is-light">Worked: {me.workedMinutes}m</span>
              <span className="tag is-primary is-light">Mode: {me.mode}</span>
            </div>
          )}
        </div>
      )}

      <h2 className="title is-5">Today's Snapshot</h2>
      <div className="content">
        {todaySummary.length === 0 && <p>No check-ins yet.</p>}
        {todaySummary.length > 0 && (
          <div className="table-container" style={{overflowX: 'auto', maxWidth: '100%'}}>
            <table className="table is-striped is-hoverable" style={{minWidth: '600px'}}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySummary.map((emp: any) => (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.full_name}</strong>
                    </td>
                    <td>
                      {emp.lastIn ? (
                        <span className="tag is-success is-light">{emp.lastIn}</span>
                      ) : (
                        <span className="has-text-grey-light">—</span>
                      )}
                    </td>
                    <td>
                      {emp.lastOut ? (
                        <span className="tag is-warning is-light">{emp.lastOut}</span>
                      ) : (
                        <span className="has-text-grey-light">—</span>
                      )}
                    </td>
                    <td>
                      <span className="tag is-info is-light">{emp.workedHours}</span>
                    </td>
                    <td>
                      <span className={`tag is-${emp.mode === 'office' ? 'primary' : 'link'} is-light`}>
                        {emp.mode}
                      </span>
                    </td>
                    <td>
                      {emp.open ? (
                        <span className="tag is-danger is-light">Active</span>
                      ) : emp.lastIn ? (
                        <span className="tag is-success is-light">Complete</span>
                      ) : (
                        <span className="tag is-light">Not Started</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}


