"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
export default function UserPage(){
  const { slug } = useParams();
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [msg,setMsg]=useState('');
  const check = async ()=>{ const r = await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ slug, mode })}); const j = await r.json(); setMsg(r.ok?`Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`:j.error||'Error'); };
  const out = async ()=>{ const r = await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ slug })}); const j = await r.json(); setMsg(r.ok?`Checked out at ${new Date(j.checkout_ts||Date.now()).toLocaleTimeString()}`:j.error||'Error'); };
  useEffect(()=>{ if(typeof window!=='undefined') localStorage.setItem('mode', mode); },[mode]);
  useEffect(()=>{ const saved = typeof window!=='undefined' ? (localStorage.getItem('mode') as any) : null; if(saved) setMode(saved); },[]);
  return (
    <main className="container-narrow section">
      <h1 className="title is-5">Hello, {String(slug).replace(/-/g,' ')}</h1>
      <div className="buttons">
        <button className={`button ${mode==='office'?'is-primary':''}`} onClick={()=>setMode('office')}>Office</button>
        <button className={`button ${mode==='remote'?'is-link is-light':''}`} onClick={()=>setMode('remote')}>Remote</button>
      </div>
      <div className="buttons">
        <button className="button is-success" onClick={check}>Check In</button>
        <button className="button is-danger is-light" onClick={out}>Check Out</button>
      </div>
      {msg && <p className="mt-3">{msg}</p>}
    </main>
  );
}


