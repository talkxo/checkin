// Indicative India holiday templates for 2026 — floating festivals shift
// yearly and states differ, so these are starting points to review and edit,
// not gospel. Apply adds only pairs not already on the calendar.

export interface HolidayTemplate {
  key: string;
  label: string;
  holidays: Array<{ name: string; date: string }>;
  /** The team's legacy set — badged as "Preferred" in Settings. */
  preferred?: boolean;
}

// The co-working set the team has run on for years — the default we point at.
const COWORKING: Array<{ name: string; date: string }> = [
  { name: 'Republic Day', date: '2026-01-26' },
  { name: 'Holi', date: '2026-03-04' },
  { name: 'Id-Ul-Fitr', date: '2026-03-21' },
  { name: 'Ram Navmi', date: '2026-03-26' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan', date: '2026-08-28' },
  { name: 'Janmashtami', date: '2026-09-04' },
  { name: 'Mahatma Gandhi Jayanti', date: '2026-10-02' },
  { name: 'Dussehra', date: '2026-10-20' },
  { name: 'Diwali (Deepavali)', date: '2026-11-08' },
  { name: 'Goverdhan Puja', date: '2026-11-09' },
  { name: 'Guru Nanak Dev Jayanti', date: '2026-11-24' },
  { name: 'Christmas Day', date: '2026-12-25' },
];

const NATIONAL: Array<{ name: string; date: string }> = [
  { name: 'Republic Day', date: '2026-01-26' },
  { name: 'Maha Shivratri', date: '2026-02-15' },
  { name: 'Holi', date: '2026-03-04' },
  { name: 'Id-Ul-Fitr', date: '2026-03-21' },
  { name: 'Ram Navmi', date: '2026-03-26' },
  { name: 'Good Friday', date: '2026-04-03' },
  { name: 'Buddha Purnima', date: '2026-05-01' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan', date: '2026-08-28' },
  { name: 'Janmashtami', date: '2026-09-04' },
  { name: 'Mahatma Gandhi Jayanti', date: '2026-10-02' },
  { name: 'Dussehra', date: '2026-10-20' },
  { name: 'Diwali (Deepavali)', date: '2026-11-08' },
  { name: 'Guru Nanak Dev Jayanti', date: '2026-11-24' },
  { name: 'Christmas Day', date: '2026-12-25' },
];

export const HOLIDAY_TEMPLATES: HolidayTemplate[] = [
  { key: 'coworking', label: 'Co-working (preferred)', holidays: COWORKING, preferred: true },
  { key: 'all-india', label: 'All-India (common)', holidays: NATIONAL },
  {
    key: 'delhi-ncr',
    label: 'Delhi NCR',
    holidays: [
      ...NATIONAL,
      { name: 'Dr. Ambedkar Jayanti', date: '2026-04-14' },
      { name: 'Maharishi Valmiki Jayanti', date: '2026-10-07' },
      { name: 'Chhath Puja', date: '2026-11-15' },
    ],
  },
  {
    key: 'maharashtra',
    label: 'Maharashtra',
    holidays: [
      ...NATIONAL,
      { name: 'Shivaji Jayanti', date: '2026-02-19' },
      { name: 'Gudi Padwa', date: '2026-03-19' },
      { name: 'Dr. Ambedkar Jayanti', date: '2026-04-14' },
      { name: 'Maharashtra Day', date: '2026-05-01' },
      { name: 'Ganesh Chaturthi', date: '2026-09-14' },
    ],
  },
];
