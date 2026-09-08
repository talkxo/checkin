// Force IST for all server-side formatting to avoid env-based UTC drift in Vercel
const TZ = 'Asia/Kolkata';

export const nowIST = () => {
  // Return current UTC time; always format with IST for display.
  // Storing shifted timestamps leads to incorrect values across environments.
  return new Date();
};

/** YYYY-MM-DD key for the IST calendar day containing `d`. */
export const formatISTDateKey = (d: string | Date) => {
  try {
    return new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  } catch {
    return new Date(d).toLocaleDateString('en-CA');
  }
};

/** Semantic alias for group-by keys — "which IST day does this instant belong to". */
export const istDateKeyOf = formatISTDateKey;

/** UTC instants bounding the IST calendar day containing `d` (00:00:00.000–23:59:59.999 IST). */
export const istDayWindow = (d: string | Date = new Date()) => {
  const key = formatISTDateKey(d);
  const start = new Date(`${key}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

/** UTC instants bounding an IST calendar month; monthOffset 0 = current, -1 = previous. */
export const istMonthWindow = (monthOffset = 0, d: string | Date = new Date()) => {
  const key = formatISTDateKey(d);
  const [y, m] = key.split('-').map(Number);
  const startMonthIndex = y * 12 + (m - 1) + monthOffset; // months since epoch
  const startYear = Math.floor(startMonthIndex / 12);
  const startMonth = (startMonthIndex % 12) + 1;
  const startKey = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const endMonthIndex = startMonthIndex + 1;
  const endDay = new Date(Date.UTC(Math.floor(endMonthIndex / 12), endMonthIndex % 12, 0)).getUTCDate();
  const endKey = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { start: istDayWindow(startKey).start, end: istDayWindow(endKey).end };
};

export const isWorkdayIST = () => {
  // Derive the weekday from the IST date key, not local getters — on a UTC
  // server, Mon 00:00–05:30 IST is still Sunday in local time.
  const key = formatISTDateKey(nowIST());
  const day = new Date(`${key}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
};

export function getMondayOfWeek(date: Date): string {
  // Compute in IST date-key space so early-morning IST calls (before 05:30)
  // never roll back to the previous day's date.
  const key = formatISTDateKey(date);
  const d = new Date(`${key}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
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
