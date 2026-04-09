// Force IST for all server-side formatting to avoid env-based UTC drift in Vercel
const TZ = 'Asia/Kolkata';

export const nowIST = () => {
  // Return current UTC time; always format with IST for display.
  // Storing shifted timestamps leads to incorrect values across environments.
  return new Date();
};

export const isWorkdayIST = () => { const d = nowIST().getDay(); return d>=1 && d<=5; };

export function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export const hhmmIST = (d: string | Date) => {
  try { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: TZ}); }
  catch { return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
};

export const formatISTTimeShort = hhmmIST;

export const formatISTTime = (d: string | Date) => {
  try {
    return new Date(d).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: TZ,
    });
  } catch {
    return new Date(d).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
};

export const formatISTDateShort = (d: string | Date) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      timeZone: TZ,
    });
  } catch {
    return new Date(d).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  }
};

export const formatISTDateLong = (d: string | Date) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: TZ,
    });
  } catch {
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
};

export const formatISTDateKey = (d: string | Date) => {
  try {
    return new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  } catch {
    return new Date(d).toLocaleDateString('en-CA');
  }
};

