const TZ = (process.env.TZ || 'Asia/Kolkata').replace(/^:/, '') || 'UTC';

export const nowIST = () => {
  try { return new Date(new Date().toLocaleString('en-US', { timeZone: TZ })); }
  catch { return new Date(); }
};

export const isWorkdayIST = () => { const d = nowIST().getDay(); return d>=1 && d<=5; };

export const hhmmIST = (d: string | Date) => {
  try { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: TZ}); }
  catch { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
};


