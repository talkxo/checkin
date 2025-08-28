// Force IST for all server-side formatting to avoid env-based UTC drift in Vercel
const TZ = 'Asia/Kolkata';

export const nowIST = () => {
  // Return current UTC time; always format with IST for display.
  // Storing shifted timestamps leads to incorrect values across environments.
  return new Date();
};

export const isWorkdayIST = () => { const d = nowIST().getDay(); return d>=1 && d<=5; };

export const hhmmIST = (d: string | Date) => {
  try { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: TZ}); }
  catch { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
};


