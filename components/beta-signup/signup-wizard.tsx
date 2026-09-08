'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CalendarClock, Check, Plus, Send, Sparkles, Trash2, UserRound, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BetaSignupData,
  COMPANY_SIZES,
  CONTACT_ROLES,
  emptySignup,
  FieldErrors,
  INDUSTRIES,
  MAX_TEAM_ROWS,
  TIMEZONES,
  TOOLS,
  TeamMember,
  WORK_DAYS,
  WORK_MODELS,
  validateStep,
  sanitizeForSubmit,
} from '@/lib/beta-signup';

const DRAFT_KEY = 'insyde-beta-signup-draft';

const STEPS = [
  { title: 'About you & your company', subtitle: 'The basics, so we know who we are setting this up for.', icon: UserRound },
  { title: 'Your work week', subtitle: 'How your team runs its day — we will match check-ins to it.', icon: CalendarClock },
  { title: 'Your team & tools', subtitle: 'Who is coming in first, and anything else we should know.', icon: Users },
] as const;

const initialData = (): BetaSignupData => ({
  ...emptySignup(),
  work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
});

export default function SignupWizard() {
  const [data, setData] = useState<BetaSignupData>(initialData);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const hydrated = useRef(false);
  const hpRef = useRef<HTMLInputElement>(null);

  // Restore an in-progress draft once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setData({ ...initialData(), ...JSON.parse(saved) });
    } catch {
      /* ignore malformed drafts */
    }
    hydrated.current = true;
  }, []);

  // Autosave the draft as the user types (kept until they submit)
  useEffect(() => {
    if (!hydrated.current || reference) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* storage full/blocked — the wizard still works */
    }
  }, [data, reference]);

  // A quiet silver send-off
  useEffect(() => {
    if (!reference) return;
    localStorage.removeItem(DRAFT_KEY);
    confetti({ particleCount: 110, spread: 85, origin: { y: 0.55 }, colors: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#0f172a'] });
  }, [reference]);

  const set = useCallback(<K extends keyof BetaSignupData>(key: K, value: BetaSignupData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
    setSubmitError('');
  }, []);

  const setTeamMember = (index: number, key: keyof TeamMember, value: string) => {
    setData((d) => {
      const members = d.team_members.map((m, i) => (i === index ? { ...m, [key]: value } : m));
      return { ...d, team_members: members };
    });
    setErrors((e) => {
      const nameErr = `team_${key}_${index}`;
      if (!(nameErr in e)) return e;
      const next = { ...e };
      delete next[nameErr];
      return next;
    });
  };

  const addTeamMember = () => {
    if (data.team_members.length >= MAX_TEAM_ROWS) return;
    set('team_members', [...data.team_members, { name: '', email: '', role: '' }]);
  };

  const removeTeamMember = (index: number) => {
    set(
      'team_members',
      data.team_members.filter((_, i) => i !== index)
    );
  };

  const goNext = () => {
    const stepErrors = validateStep(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (submitting) return;
    // Final gate — any step could still be incomplete after a draft restore
    for (let s = 0; s <= 2; s++) {
      const stepErrors = validateStep(s, data);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setDirection(-1);
        setStep(s);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sanitizeForSubmit(data), hp: hpRef.current?.value ?? '' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(json?.error || 'Something went wrong. Please try again.');
        return;
      }
      setReference(json?.reference || 'BETA');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError('We could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const firstName = useMemo(() => data.contact_name.trim().split(/\s+/)[0] || 'there', [data.contact_name]);

  if (reference) {
    return <SuccessScreen reference={reference} email={data.contact_email} name={firstName} />;
  }

  const CurrentIcon = STEPS[step].icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="main-typography min-h-screen"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fb 45%, #eef0f4 100%)' }}
    >
      {/* soft silver sheen */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-72"
        style={{ background: 'radial-gradient(60% 100% at 70% 0%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)' }}
      />
      <div className="relative mx-auto w-full max-w-md px-4 py-6 sm:px-6">
        {/* Header — wordmark only, intentionally no links off this page */}
        <header className="flex items-center justify-between pb-5">
          <div className="flex items-center gap-2">
            <img
              src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
              alt="INSYDE"
              className="h-8 w-8 object-contain"
            />
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="h-2.5 w-2.5" /> Beta
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Step {step + 1} <span className="text-slate-400">of {STEPS.length}</span>
          </p>
        </header>

        {/* Segmented progress */}
        <div className="flex gap-1.5 pb-6" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={cn('h-full rounded-full bg-slate-900 transition-all duration-500', i <= step ? 'w-full' : 'w-0')}
              />
            </div>
          ))}
        </div>

        {/* Step content — enter-only animation (no exit-gated swaps) */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Step heading */}
          <div className="flex items-start gap-3 pb-5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-900/15">
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-cal-sans text-[22px] font-semibold leading-tight text-slate-900">{STEPS[step].title}</h1>
              <p className="mt-1 text-sm text-slate-500">{STEPS[step].subtitle}</p>
            </div>
          </div>

          {/* Step card */}
          <form
            className="rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-[0_10px_36px_rgba(15,23,42,0.07)] backdrop-blur-sm"
            onSubmit={(e) => {
              e.preventDefault();
              isLast ? submit() : goNext();
            }}
          >
            {step === 0 && <AboutStep data={data} errors={errors} set={set} />}
            {step === 1 && <RhythmStep data={data} errors={errors} set={set} />}
            {step === 2 && (
              <TeamStep
                data={data}
                errors={errors}
                set={set}
                setTeamMember={setTeamMember}
                addTeamMember={addTeamMember}
                removeTeamMember={removeTeamMember}
              />
            )}

            {/* Honeypot — visually removed, keyboard-invisible */}
            <input
              ref={hpRef}
              type="text"
              name="company_website_hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            {submitError && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {submitError}
              </p>
            )}

            {/* Nav */}
            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="button-press h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              {isLast ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="button-press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Request my instance
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  className="button-press h-11 flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800"
                >
                  Continue
                </button>
              )}
            </div>
          </form>

          <p className="px-2 pt-4 text-center text-xs leading-relaxed text-slate-400">
            Your details go straight to the INSYDE team — nothing is shared, and we will only
            email you about your setup.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────── field primitives ─────────────────────────── */

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  'h-11 rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed';

function TextInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputCls, 'w-full', props.className)}
      {...props}
    />
  );
}

function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'button-press rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all',
        selected
          ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        className
      )}
    >
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="pb-3 text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-400">{children}</p>;
}

/* ─────────────────── step 1 — you + organisation ──────────────────── */

function AboutStep({
  data,
  errors,
  set,
}: {
  data: BetaSignupData;
  errors: FieldErrors;
  set: <K extends keyof BetaSignupData>(key: K, value: BetaSignupData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <GroupLabel>You</GroupLabel>
        <div className="space-y-4">
          <Field label="Your full name" required error={errors.contact_name}>
            <TextInput
              value={data.contact_name}
              onChange={(v) => set('contact_name', v)}
              placeholder="Asha Verma"
              autoComplete="name"
            />
          </Field>
          <Field label="Work email" required error={errors.contact_email}>
            <TextInput
              value={data.contact_email}
              onChange={(v) => set('contact_email', v)}
              placeholder="asha@yourcompany.com"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          </Field>
          <Field label="What do you do here?">
            <div className="flex flex-wrap gap-2">
              {CONTACT_ROLES.map((r) => (
                <Chip key={r} selected={data.contact_role === r} onClick={() => set('contact_role', data.contact_role === r ? '' : r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Phone (optional)" error={errors.contact_phone}>
            <TextInput
              value={data.contact_phone}
              onChange={(v) => set('contact_phone', v)}
              placeholder="+91 98765 43210"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <GroupLabel>Your company</GroupLabel>
        <div className="space-y-4">
          <Field label="Company name" required error={errors.company_name}>
            <TextInput
              value={data.company_name}
              onChange={(v) => set('company_name', v)}
              placeholder="Acme Studio"
              autoComplete="organization"
            />
          </Field>
          <Field label="Website (optional)" error={errors.website}>
            <TextInput
              value={data.website}
              onChange={(v) => set('website', v)}
              placeholder="acmestudio.com"
              inputMode="url"
              autoComplete="url"
            />
          </Field>
          <Field label="Industry">
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => (
                <Chip key={ind} selected={data.industry === ind} onClick={() => set('industry', data.industry === ind ? '' : ind)}>
                  {ind}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Team size">
            <div className="flex flex-wrap gap-2">
              {COMPANY_SIZES.map((size) => (
                <Chip
                  key={size}
                  selected={data.company_size === size}
                  onClick={() => set('company_size', data.company_size === size ? '' : size)}
                  className="flex-1 basis-16"
                >
                  {size}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── step 2 — work week ────────────────────────── */

function RhythmStep({
  data,
  errors,
  set,
}: {
  data: BetaSignupData;
  errors: FieldErrors;
  set: <K extends keyof BetaSignupData>(key: K, value: BetaSignupData[K]) => void;
}) {
  const toggleDay = (day: string) => {
    const has = data.work_days.includes(day);
    set('work_days', has ? data.work_days.filter((d) => d !== day) : [...data.work_days, day]);
  };

  return (
    <div className="space-y-5">
      <Field label="Where does work happen?" required error={errors.work_model}>
        <div className="grid grid-cols-3 gap-2">
          {WORK_MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => set('work_model', m.value)}
              aria-pressed={data.work_model === m.value}
              className={cn(
                'button-press flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-4 text-sm font-semibold transition-all',
                data.work_model === m.value
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="text-xl" aria-hidden>
                {m.emoji}
              </span>
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Working days" required error={errors.work_days}>
        <div className="flex flex-wrap gap-2">
          {WORK_DAYS.map((d) => (
            <Chip
              key={d.value}
              selected={data.work_days.includes(d.value)}
              onClick={() => toggleDay(d.value)}
              className="flex-1 basis-12 rounded-full text-xs font-semibold uppercase"
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Day starts" required error={errors.work_start_time}>
          <input
            type="time"
            value={data.work_start_time}
            onChange={(e) => set('work_start_time', e.target.value)}
            className={cn(inputCls, 'w-full')}
          />
        </Field>
        <Field label="Day ends" required error={errors.work_end_time}>
          <input
            type="time"
            value={data.work_end_time}
            onChange={(e) => set('work_end_time', e.target.value)}
            className={cn(inputCls, 'w-full')}
          />
        </Field>
      </div>

      <Field label="Time zone">
        <select
          value={data.timezone}
          onChange={(e) => set('timezone', e.target.value)}
          className={cn(inputCls, 'w-full')}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

/* ─────────────────────── step 3 — team, tools, send ─────────────────────── */

function TeamStep({
  data,
  errors,
  set,
  setTeamMember,
  addTeamMember,
  removeTeamMember,
}: {
  data: BetaSignupData;
  errors: FieldErrors;
  set: <K extends keyof BetaSignupData>(key: K, value: BetaSignupData[K]) => void;
  setTeamMember: (index: number, key: keyof TeamMember, value: string) => void;
  addTeamMember: () => void;
  removeTeamMember: (index: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-500">
          Teammates joining the beta
          <span className="ml-2 normal-case tracking-normal text-slate-400">
            ({data.team_members.length}/{MAX_TEAM_ROWS})
          </span>
        </label>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Add the people we should create accounts for first — you can always invite more later.
        </p>

        <div className="mt-3 space-y-3">
          {data.team_members.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <button
                type="button"
                onClick={() => removeTeamMember(i)}
                aria-label={`Remove ${m.name || 'teammate'}`}
                className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-2 gap-2 pr-8">
                <div>
                  <input
                    value={m.name}
                    onChange={(e) => setTeamMember(i, 'name', e.target.value)}
                    placeholder="Full name"
                    autoComplete="off"
                    className={cn(inputCls, 'w-full border px-3 text-sm outline-none', errors[`team_name_${i}`] && 'border-red-400')}
                  />
                  {errors[`team_name_${i}`] && <p className="mt-1 text-xs font-medium text-red-500">{errors[`team_name_${i}`]}</p>}
                </div>
                <input
                  value={m.role}
                  onChange={(e) => setTeamMember(i, 'role', e.target.value)}
                  placeholder="Role (optional)"
                  autoComplete="off"
                  className={cn(inputCls, 'w-full border px-3 text-sm outline-none')}
                />
                <div className="col-span-2">
                  <input
                    value={m.email}
                    onChange={(e) => setTeamMember(i, 'email', e.target.value)}
                    placeholder="Work email (optional)"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    className={cn(inputCls, 'w-full border px-3 text-sm outline-none', errors[`team_email_${i}`] && 'border-red-400')}
                  />
                  {errors[`team_email_${i}`] && <p className="mt-1 text-xs font-medium text-red-500">{errors[`team_email_${i}`]}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          type="button"
          onClick={addTeamMember}
          disabled={data.team_members.length >= MAX_TEAM_ROWS}
          className="button-press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add teammate
        </button>
      </div>

      <Field label="Tools you already use">
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((tool) => {
            const selected = data.tools.includes(tool);
            return (
              <Chip
                key={tool}
                selected={selected}
                onClick={() => set('tools', selected ? data.tools.filter((t) => t !== tool) : [...data.tools, tool])}
              >
                <span className="inline-flex items-center gap-1.5">
                  {selected && <Check className="h-3.5 w-3.5" />}
                  {tool}
                </span>
              </Chip>
            );
          })}
        </div>
      </Field>

      <Field label="Anything else we should know? (optional)">
        <textarea
          value={data.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Shifts, policies, existing systems — anything that helps us set you up…"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
        />
      </Field>
    </div>
  );
}

/* ──────────────────────────── success screen ───────────────────────────── */

function SuccessScreen({ reference, email, name }: { reference: string; email: string; name: string }) {
  return (
    <div className="main-typography flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fb 45%, #eef0f4 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto w-full max-w-md px-4 sm:px-6"
      >
        <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-[0_16px_48px_rgba(15,23,42,0.09)]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-900/25"
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.div>

          <h1 className="font-cal-sans mt-5 text-2xl font-semibold text-slate-900">
            You&rsquo;re on the list, {name}!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            We have everything we need to start shaping your INSYDE instance. A confirmation is
            headed to <span className="font-semibold text-slate-900">{email}</span>.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-500">Your reference</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-widest text-slate-900">{reference}</p>
          </div>

          <div className="mt-6 space-y-2.5 text-left">
            {[
              'We review your setup within 2–3 working days.',
              'You get your instance link and first logins by email.',
              'Your team checks in on day one. 🎉',
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-500">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                  {i + 1}
                </span>
                {line}
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
            Questions? Just reply to the confirmation email — a human reads every one.
          </p>
        </div>

        <p className="pt-4 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          INSYDE · Beta program
        </p>
      </motion.div>
    </div>
  );
}
