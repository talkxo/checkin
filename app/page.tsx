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
      {/* Header with user info */}
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
                    <p className="has-text-grey is-size-7">Updated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="level-right">
            <div className="level-item">
              <span className="icon has-text-grey">
                <i className="fas fa-bell"></i>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Current Time Display */}
      <div className="has-text-centered mb-5">
        <h1 className="title is-1 has-text-weight-bold mb-2">{timeString}</h1>
        <p className="has-text-grey">{dateString}</p>
      </div>
      
      <div className="box">
        {!currentSession ? (
          <>
            <div className="field">
              <label className="label">Name</label>
              <div className="control">
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your name"
                  disabled={isSubmitting}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    searchEmployees(e.target.value);
                  }}
                  onFocus={() => {
                    if (name.length >= 2) {
                      searchEmployees(name);
                    }
                  }}
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
                            fetchMySummary(emp.slug);
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

            <div className="field">
              <label className="label">Mode</label>
              <div className="buttons">
                <button className={`button ${mode==='office'?'is-primary':''}`} onClick={()=>setMode('office')}>Office</button>
                <button className={`button ${mode==='remote'?'is-link is-light':''}`} onClick={()=>setMode('remote')}>Remote</button>
              </div>
            </div>

            {/* Large Action Button */}
            <div className="has-text-centered">
              <div className="mb-4">
                <div 
                  className={`is-clickable ${!name.trim() || isSubmitting ? 'is-disabled' : ''}`}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    margin: '0 auto',
                    background: holdProgress > 0 
                      ? `conic-gradient(from 0deg, #48c774 ${holdProgress * 3.6}deg, #f5f5f5 ${holdProgress * 3.6}deg)`
                      : 'linear-gradient(135deg, #48c774, #00d1b2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: name.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                    opacity: name.trim() && !isSubmitting ? 1 : 0.6,
                    transition: 'all 0.3s ease',
                    boxShadow: holdProgress > 0 ? '0 0 20px rgba(72, 199, 116, 0.5)' : '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseDown={name.trim() && !isSubmitting ? handleHoldStart : undefined}
                  onMouseUp={handleHoldEnd}
                  onMouseLeave={handleHoldEnd}
                  onTouchStart={name.trim() && !isSubmitting ? handleHoldStart : undefined}
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

            {/* Location Display */}
            <div className="has-text-centered mb-4">
              <span className="icon has-text-grey">
                <i className="fas fa-map-marker-alt"></i>
              </span>
              <span className="has-text-grey">Location: {mode === 'office' ? 'Sequire Tower Office' : 'Remote'}</span>
            </div>
          </>
        ) : (
          <div className="has-text-centered">
            <h2 className="title is-5">Welcome back, {currentSession.employee.full_name}!</h2>
            {hasOpen ? (
              <div className="mb-4">
                <p className="has-text-grey">Session started at {new Date(currentSession.session.checkin_ts).toLocaleTimeString()}</p>
                <p className="title is-3 has-text-primary">{formatTime(elapsedTime)}</p>
                <p className="has-text-grey-light">Elapsed time</p>
              </div>
            ) : (
              <p className="has-text-grey">Your session has ended</p>
            )}
            
            {/* Large Action Button for logged in users */}
            {hasOpen && (
              <div className="mb-4">
                <div 
                  className="is-clickable"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    margin: '0 auto',
                    background: holdProgress > 0 
                      ? `conic-gradient(from 0deg, #f14668 ${holdProgress * 3.6}deg, #f5f5f5 ${holdProgress * 3.6}deg)`
                      : 'linear-gradient(135deg, #f14668, #ff3860)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: holdProgress > 0 ? '0 0 20px rgba(241, 70, 104, 0.5)' : '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                  onMouseLeave={handleHoldEnd}
                  onTouchStart={handleHoldStart}
                  onTouchEnd={handleHoldEnd}
                >
                  <div className="has-text-white has-text-centered">
                    <span className="icon is-large">
                      <i className="fas fa-sign-out-alt"></i>
                    </span>
                    <p className="has-text-weight-semibold mt-2">Clock Out</p>
                  </div>
                </div>
                {holdProgress > 0 && (
                  <p className="has-text-grey is-size-7 mt-2">Hold to confirm ({Math.round(holdProgress)}%)</p>
                )}
              </div>
            )}
            
            <div className="buttons is-centered">
              {!hasOpen && (
                <button className="button is-light" onClick={() => {
                  localStorage.removeItem('currentSession');
                  setCurrentSession(null);
                  setName('');
                  setHasOpen(false);
                  setElapsedTime(0);
                }}>Start New Session</button>
              )}
            </div>
          </div>
        )}

        {msg && <p className="mt-3 has-text-centered">{msg}</p>}

        {me && (
          <div className="tags">
            <span className="tag is-info is-light">Last In: {me.lastIn ? new Date(me.lastIn).toLocaleTimeString() : 'N/A'}</span>
            <span className="tag is-warning is-light">Last Out: {me.lastOut ? new Date(me.lastOut).toLocaleTimeString() : 'N/A'}</span>
            <span className="tag is-success is-light">Worked: {me.workedMinutes}m</span>
            <span className="tag is-primary is-light">Mode: {me.mode}</span>
          </div>
        )}
      </div>

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


