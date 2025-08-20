const TZ = (process.env.TZ || 'Asia/Kolkata').replace(/^:/, '') || 'UTC';

export const nowIST = () => {
  try { 
    // Get current time and convert to IST
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return istTime;
  }
  catch { 
    // Fallback: manually add IST offset (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 hours in milliseconds
    return new Date(now.getTime() + istOffset);
  }
};

export const isWorkdayIST = () => { const d = nowIST().getDay(); return d>=1 && d<=5; };

export const hhmmIST = (d: string | Date) => {
  try { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: TZ}); }
  catch { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
};


