"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hhmmIST } from '@/lib/time';

export default function UserPage(){
  const params = useParams();
  const slug = params?.slug as string;
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [msg,setMsg]=useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(()=>{
    const saved = (typeof window!== 'undefined' ? (localStorage.getItem('mode') as any) : null) || 'office';
    setMode(saved);
  },[]);

  const act = async (checkMode: 'office' | 'remote') => {
    if (!slug) return;
    setIsSubmitting(true);
    setMsg('');
    const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, mode: checkMode }) });
    const j = await r.json();
    if (r.ok) {
      const message = `Checked in at ${hhmmIST(j.session.checkin_ts)}`;
      setMsg(message);
    } else {
      setMsg(j.error || 'Error');
    }
    setIsSubmitting(false);
  };

  const checkout = async () => {
    if (!slug) return;
    setIsSubmitting(true);
    setMsg('');
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
    const j = await r.json();
    if (r.ok) {
      const message = `Checked out at ${hhmmIST(j.checkout_ts)}`;
      setMsg(message);
    } else {
      setMsg(j.error || 'Error');
    }
    setIsSubmitting(false);
  };

  useEffect(()=>{ if(typeof window!== 'undefined') localStorage.setItem('mode', mode); },[mode]);

  if (!slug) {
    return <div className="main-typography ambient-page min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Invalid user</p>
    </div>;
  }

  return (
    <div className="main-typography ambient-page min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto flex min-h-[85vh] items-center">
        <div className="glass w-full rounded-3xl p-6">
          <h1 className="text-2xl font-semibold text-center mb-6 text-foreground">Check-in for {slug}</h1>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Select your work mode:</p>
              <div className="flex gap-2 justify-center">
                <button
                  className={`px-4 py-2 rounded-xl font-medium border transition-all ${
                    mode === 'office'
                      ? 'bg-gradient-brand border-transparent text-white shadow-primary'
                      : 'glass-hover border-glass-border bg-transparent text-muted-foreground'
                  }`}
                  onClick={() => setMode('office')}
                >
                  Office
                </button>
                <button
                  className={`px-4 py-2 rounded-xl font-medium border transition-all ${
                    mode === 'remote'
                      ? 'bg-gradient-brand border-transparent text-white shadow-primary'
                      : 'glass-hover border-glass-border bg-transparent text-muted-foreground'
                  }`}
                  onClick={() => setMode('remote')}
                >
                  Remote
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 bg-gradient-brand text-white font-medium py-3 px-4 rounded-xl shadow-primary button-press transition-all duration-200 disabled:opacity-50"
                onClick={() => act(mode)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Checking in...' : 'Check In'}
              </button>
              <button
                className="flex-1 bg-destructive text-white font-medium py-3 px-4 rounded-xl button-press transition-colors duration-200 disabled:opacity-50"
                onClick={checkout}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Checking out...' : 'Check Out'}
              </button>
            </div>

            {msg && (
              <p className="text-center text-sm text-muted-foreground">
                {msg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
