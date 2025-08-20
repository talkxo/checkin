"use client";
import { useEffect, useState } from 'react';
export default function Home(){
  const [name,setName]=useState('');
  const [status,setStatus]=useState<string>('');
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [today,setToday]=useState<any[]>([]);
  const [todaySummary,setTodaySummary]=useState<any[]>([]);
  const [suggestions,setSuggestions]=useState<any[]>([]);
  const [slug,setSlug]=useState<string>('');
  const [hasOpen,setHasOpen]=useState(false);
  const [me,setMe]=useState<any|null>(null);
  const [pending,setPending]=useState(false);
    useEffect(()=>{
    const saved = (typeof window!== 'undefined' ? (localStorage.getItem('mode') as any) : null) || 'office';
    setMode(saved);
    fetch('/api/today').then(r=>r.json()).then(setToday);
    fetch('/api/today/summary').then(r=>r.json()).then(setTodaySummary);
  },[]);
  const onNameChange = async (val:string)=>{
    setName(val); setSlug(''); setHasOpen(false);
    if(val.trim().length<2){ setSuggestions([]); return; }
    const res = await fetch('/api/employees?q='+encodeURIComponent(val));
    const list = res.ok? await res.json():[];
    setSuggestions(list);
  };
  const choose = async (emp:any)=>{
    setName(emp.full_name); setSlug(emp.slug); setSuggestions([]);
    const r = await fetch('/api/session/open?slug='+emp.slug);
    const j = await r.json(); setHasOpen(j.ok);
    const sm = await fetch('/api/summary/me?slug='+emp.slug).then(r=>r.json()); setMe(sm);
  };
  const act = async (m:'office'|'remote')=>{
    if(pending) return; setPending(true); setStatus('');
    if(typeof window!== 'undefined') localStorage.setItem('mode', m);
    const r = await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ fullName: slug? undefined : name, slug: slug || undefined, mode:m })});
    const j = await r.json();
    if(r.status===409){ setHasOpen(true); setStatus('Open session exists'); }
    else { setHasOpen(false); setStatus(r.ok?`Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`:j.error||'Error'); await fetch('/api/today').then(r=>r.json()).then(setToday); await fetch('/api/today/summary').then(r=>r.json()).then(setTodaySummary); }
    setPending(false);
  };
  const checkout = async ()=>{
    if(!slug || pending) return; setPending(true);
    const r = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ slug })});
    const j = await r.json();
    setStatus(r.ok?`Checked out at ${new Date(j.checkout_ts||Date.now()).toLocaleTimeString()}`:j.error||'Error');
    setHasOpen(false);
    await fetch('/api/today').then(r=>r.json()).then(setToday);
    await fetch('/api/today/summary').then(r=>r.json()).then(setTodaySummary);
    setPending(false);
  };
  return (
    <main className="container-narrow">
      <section className="section">
        <h1 className="title is-4">Quick Check-in</h1>
        <div className="box">
          <div className="field">
            <label className="label">Your Name</label>
            <div className="control">
              <input className="input" placeholder="Type your name" value={name} onChange={e=>onNameChange(e.target.value)} />
              {suggestions.length>0 && (
                <div className="box" style={{marginTop:'.5rem'}}>
                  {suggestions.map((s:any)=> (
                    <button key={s.id} className="button is-white is-fullwidth has-text-left" onClick={()=>choose(s)}>
                      {s.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="buttons is-centered">
            {!hasOpen ? (
              <>
                <button disabled={pending || !name} className={`button is-primary ${pending?'is-loading':''}`} onClick={()=>act('office')}>Check In</button>
                <button disabled={pending || !name} className={`button is-link is-light ${pending?'is-loading':''}`} onClick={()=>act('remote')}>Remote</button>
              </>
            ) : (
              <button disabled={pending} className={`button is-danger is-light ${pending?'is-loading':''}`} onClick={checkout}>Check Out</button>
            )}
          </div>
          {hasOpen && (
            <div className="has-text-success mb-2">Open session exists</div>
          )}
          {hasOpen && (
            <div className="buttons is-centered">
              <button disabled={pending} className={`button is-danger is-light ${pending?'is-loading':''}`} onClick={checkout}>Check Out</button>
            </div>
          )}
          {status && <p className="has-text-success mt-2">{status}</p>}
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
      </section>
    </main>
  );
}


