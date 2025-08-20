export const nowIST = () => new Date(new Date().toLocaleString('en-US', { timeZone: process.env.TZ || 'Asia/Kolkata' }));
export const isWorkdayIST = () => { const d = nowIST().getDay(); return d>=1 && d<=5; };
export const hhmmIST = (d: string | Date) => new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: process.env.TZ || 'Asia/Kolkata'});


