// Shared contract for the beta-program signup wizard (/insyde/signup).
// Used by the client wizard for per-step validation and by the
// /api/beta-signup route for server-side re-validation.

// The four goals the wizard asks about — multi-select, capped at 3.
export const GOALS = [
  'Org-wide discipline',
  'Optimise teamwork & space',
  'Formalise HR processes',
  'Frictionless attendance',
] as const;

export interface BetaSignupData {
  contact_name: string;
  contact_email: string;
  contact_role: string;
  contact_phone: string;

  company_name: string;
  website: string;
  industry: string;
  company_size: string;
  work_model: string;

  work_days: string[];
  work_start_time: string;
  work_end_time: string;
  timezone: string;

  goals: string[];
  tools: string[];

  notes: string;
}

export type FieldErrors = Record<string, string>;

export const emptySignup = (): BetaSignupData => ({
  contact_name: '',
  contact_email: '',
  contact_role: '',
  contact_phone: '',

  company_name: '',
  website: '',
  industry: '',
  company_size: '',
  work_model: '',

  work_days: [],
  work_start_time: '',
  work_end_time: '',
  timezone: 'Asia/Kolkata',

  goals: [],
  tools: [],

  notes: '',
});

export const WORK_MODELS = [
  { value: 'office', label: 'Office', emoji: '🏢' },
  { value: 'hybrid', label: 'Hybrid', emoji: '🔀' },
  { value: 'remote', label: 'Remote', emoji: '🌍' },
] as const;

export const COMPANY_SIZES = ['1–10', '11–30', '31–75', '76–150', '150+'] as const;

export const INDUSTRIES = [
  'Design / Creative',
  'Software / IT',
  'Marketing / Agency',
  'Consulting',
  'E-commerce',
  'Education',
  'Healthcare',
  'Finance',
  'Other',
] as const;

export const WORK_DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

export const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
] as const;export const TOOLS = [
  'Basecamp',
  'Slack',
  'Google Workspace',
  'Microsoft 365',
  'Notion',
  'Zoho',
  'Zoom',
] as const;

export const CONTACT_ROLES = [
  'Founder / CEO',
  'HR / People Ops',
  'Operations',
  'Office Admin',
  'Team Lead',
  'Other',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());

/** Validate one wizard step (0-indexed, 3 steps total). Returns field → error message. */
export function validateStep(step: number, d: BetaSignupData): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    // You + organisation
    if (!d.contact_name.trim()) errors.contact_name = 'Please tell us your name.';
    else if (d.contact_name.trim().length > 80) errors.contact_name = 'Keep it under 80 characters.';
    if (!d.contact_email.trim()) errors.contact_email = 'We need a work email to reach you.';
    else if (!isValidEmail(d.contact_email)) errors.contact_email = 'That email does not look right.';
    else if (d.contact_email.trim().length > 120) errors.contact_email = 'Keep it under 120 characters.';
    if (d.contact_phone.trim() && !/^[+\d][\d\s\-()]{5,19}$/.test(d.contact_phone.trim()))
      errors.contact_phone = 'That phone number does not look right.';
    if (!d.company_name.trim()) errors.company_name = 'Company name is required.';
    else if (d.company_name.trim().length > 120) errors.company_name = 'Keep it under 120 characters.';
    if (d.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(d.website.trim()))
      errors.website = 'That URL does not look right.';
  }

  if (step === 1) {
    if (!WORK_MODELS.some((m) => m.value === d.work_model)) errors.work_model = 'Pick how your team works.';
    if (d.work_days.length === 0) errors.work_days = 'Pick at least one working day.';
    if (!TIME_RE.test(d.work_start_time)) errors.work_start_time = 'Set a start time.';
    if (!TIME_RE.test(d.work_end_time)) errors.work_end_time = 'Set an end time.';
  }

  if (step === 2) {
    if (d.goals.length === 0) errors.goals = 'Pick at least one.';
  }

  return errors;
}

/** Full payload check before submit — mirrors validateStep across all steps. */
export function validateAll(d: BetaSignupData): FieldErrors {
  return { ...validateStep(0, d), ...validateStep(1, d), ...validateStep(2, d) };
}

/** Trimmed, size-capped payload ready for the API. */
export function sanitizeForSubmit(d: BetaSignupData): BetaSignupData {
  const clip = (v: string, n: number) => v.trim().slice(0, n);
  return {
    contact_name: clip(d.contact_name, 80),
    contact_email: clip(d.contact_email, 120).toLowerCase(),
    contact_role: clip(d.contact_role, 60),
    contact_phone: clip(d.contact_phone, 20),

    company_name: clip(d.company_name, 120),
    website: clip(d.website, 200),
    industry: clip(d.industry, 60),
    company_size: clip(d.company_size, 20),
    work_model: clip(d.work_model, 10),

    work_days: d.work_days.slice(0, 7),
    work_start_time: clip(d.work_start_time, 5),
    work_end_time: clip(d.work_end_time, 5),
    timezone: clip(d.timezone, 40),

    goals: d.goals.filter((g) => (GOALS as readonly string[]).includes(g)).slice(0, 3),
    tools: d.tools.slice(0, 20),

    notes: clip(d.notes, 1000),
  };
}
