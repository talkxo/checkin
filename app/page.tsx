"use client";
import { useEffect, useState } from 'react';
export default function Home(){
  const [name,setName]=useState('');
  const [status,setStatus]=useState<string>('');
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [today,setToday]=useState<any[]>([]);
  useEffect(()=>{ 
    const saved = (typeof window!== 'undefined' ? (localStorage.getItem('mode') as any) : null) || 'office';
    setMode(saved);
    fetch('/api/today').then(r=>r.json()).then(setToday); 
  },[]);
  const act = async (m:'office'|'remote')=>{ setStatus(''); localStorage.setItem('mode', m); const r = await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ fullName:name, mode:m })}); const j = await r.json(); setStatus(r.ok?`Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`:j.error||'Error'); fetch('/api/today').then(r=>r.json()).then(setToday); };
  return (
    <main className="container-narrow">
      <section className="section">
        <h1 className="title is-4">Quick Check-in</h1>
        <div className="box">
          <div className="field">
            <label className="label">Your Name</label>
            <div className="control"><input className="input" placeholder="Type your name" value={name} onChange={e=>setName(e.target.value)} /></div>
          </div>
          <div className="buttons is-centered">
            <button className={`button is-primary`} onClick={()=>act('office')}>Check In (Office)</button>
            <button className={`button is-link is-light`} onClick={()=>act('remote')}>Check In (Remote)</button>
          </div>
          {status && <p className="has-text-success mt-2">{status}</p>}
        </div>
        <h2 className="title is-5">Today's Snapshot</h2>
        <div className="content">
          {today.length===0 && <p>No check-ins yet.</p>}
          {today.length>0 && <ul>{today.map((t:any,i:number)=> <li key={i}>• {t.full_name} — {t.mode} — {new Date(t.checkin_ts).toLocaleTimeString()}</li>)}</ul>}
        </div>
      </section>
    </main>
  );
}


