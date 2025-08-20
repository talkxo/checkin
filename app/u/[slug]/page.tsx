"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserPage(){
  const params = useParams();
  const slug = params?.slug as string;
  const [mode,setMode]=useState<'office'|'remote'>('office');
  const [msg,setMsg]=useState('');
  const [pending,setPending]=useState(false);
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
      const message = `Checked in at ${new Date(j.session.checkin_ts).toLocaleTimeString()}`;
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
      const message = `Checked out at ${new Date(j.checkout_ts).toLocaleTimeString()}`;
      setMsg(message);
    } else {
      setMsg(j.error || 'Error');
    }
    setIsSubmitting(false);
  };

  useEffect(()=>{ if(typeof window!== 'undefined') localStorage.setItem('mode', mode); },[mode]);

  if (!slug) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-600">Invalid user</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">Check-in for {slug}</h1>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Select your work mode:</p>
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

            <div className="flex gap-2">
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
                onClick={() => act(mode)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Checking in...' : 'Check In'}
              </button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
                onClick={checkout}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Checking out...' : 'Check Out'}
              </button>
            </div>

            {msg && (
              <p className="text-center text-sm text-gray-600">
                {msg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


