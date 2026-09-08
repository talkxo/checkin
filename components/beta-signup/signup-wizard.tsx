'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, ChevronDown, ClipboardList, Send, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BetaSignupData,
  COMPANY_SIZES,
  CONTACT_ROLES,
  emptySignup,
  FieldErrors,
  GOALS,
  INDUSTRIES,
  TIMEZONES,
  TOOLS,
  WORK_DAYS,
  WORK_MODELS,
  validateStep,
  sanitizeForSubmit,
} from '@/lib/beta-signup';

const DRAFT_KEY = 'insyde-beta-signup-draft';

const STEPS = ['About you & company', 'Work week', 'Team & tools'] as const;

const initialData = (): BetaSignupData => ({
  ...emptySignup(),
  work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
});

// One type scale across every control. 16px inputs also stop iOS zoom-on-focus.
const cardCls =
  'rounded-3xl border border-white/70 bg-white/55 shadow-[0_10px_36px_rgba(15,23,42,0.07)] backdrop-blur-xl';
const inputCls =
  'h-12 w-full rounded-xl border border-slate-200/90 bg-white/85 px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed';
const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';
const chipCls =
  'button-press inline-flex h-10 items-center justify-center rounded-xl border px-3.5 text-sm font-medium transition-all';

// Team size bucket → representative headcount + dots in the visualisation
const SIZE_META: Record<string, { approx: string; dots: number }> = {
  '1–10': { approx: '~5', dots: 3 },
  '11–30': { approx: '~20', dots: 5 },
  '31–75': { approx: '~50', dots: 7 },
  '76–150': { approx: '~100', dots: 9 },
  '150+': { approx: '150+', dots: 12 },
};

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setData({ ...initialData(), ...JSON.parse(saved) });
    } catch {
      /* ignore malformed drafts */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || reference) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* storage full/blocked — the wizard still works */
    }
  }, [data, reference]);

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

  const firstName = useMemo(() => data.contact_name.trim().split(/\s+/)[0] || '', [data.contact_name]);

  if (reference) {
    return <SuccessScreen reference={reference} email={data.contact_email} name={firstName || 'there'} />;
  }

  const isLast = step === STEPS.length - 1;
  // Step 1's kicker greets the user as soon as they type their name
  const kicker = step === 0 && firstName ? `Hello, ${firstName}` : STEPS[step];

  return (
    <div
      className="main-typography min-h-screen"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f7f8fb 45%, #edeef3 100%)' }}
    >
      {/* silvery backdrop the glass refracts — deliberately no colour */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 right-[-12%] h-[28rem] w-[28rem] rounded-full bg-slate-300/45 blur-3xl" />
        <div className="absolute bottom-[-14%] left-[-12%] h-[26rem] w-[26rem] rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/90 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-4 py-6 sm:px-6">
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

        <div className="flex gap-1.5 pb-4" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-slate-300/60">
              <div className={cn('h-full rounded-full bg-slate-900 transition-all duration-500', i <= step ? 'w-full' : 'w-0')} />
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* single kicker per step — greets by name once they type it */}
          <div className="pb-3 pt-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={kicker}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"
              >
                {kicker}
              </motion.p>
            </AnimatePresence>
          </div>

          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            isLast ? submit() : goNext();
          }}>
            {step === 0 && <AboutStep data={data} errors={errors} set={set} />}
            {step === 1 && <RhythmStep data={data} errors={errors} set={set} />}
            {step === 2 && <TeamStep data={data} errors={errors} set={set} />}

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
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{submitError}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="button-press h-12 rounded-xl border border-slate-200/90 bg-white/70 px-5 text-[15px] font-semibold text-slate-700 backdrop-blur transition-colors hover:bg-white"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="button-press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 text-[15px] font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Sending…
                  </>
                ) : isLast ? (
                  <>
                    <Send className="h-4 w-4" />
                    Request my instance
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
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
      <label className={labelCls}>
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

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
      className={inputCls}
      {...props}
    />
  );
}

function SelectInput({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, 'appearance-none pr-10', !value && 'text-slate-400')}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-base text-slate-900">
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
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
        chipCls,
        selected
          ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
          : 'border-slate-200/90 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white',
        className
      )}
    >
      {children}
    </button>
  );
}

/* ─────────────────── step 1 — two cards: you + company ─────────────────── */

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
    <>
      <div className={cn(cardCls, 'space-y-4 p-5')}>
        <Field label="Full name" required error={errors.contact_name}>
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
        <Field label="Role">
          <SelectInput
            value={data.contact_role}
            onChange={(v) => set('contact_role', v)}
            placeholder="Select"
            options={CONTACT_ROLES}
          />
        </Field>
        <Field label="Phone" error={errors.contact_phone}>
          <TextInput
            value={data.contact_phone}
            onChange={(v) => set('contact_phone', v)}
            placeholder="Optional"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      </div>

      <div className={cn(cardCls, 'space-y-4 p-5')}>
        <Field label="Company name" required error={errors.company_name}>
          <TextInput
            value={data.company_name}
            onChange={(v) => set('company_name', v)}
            placeholder="Acme Studio"
            autoComplete="organization"
          />
        </Field>
        <Field label="Website" error={errors.website}>
          <TextInput
            value={data.website}
            onChange={(v) => set('website', v)}
            placeholder="Optional"
            inputMode="url"
            autoComplete="url"
          />
        </Field>
        <Field label="Industry">
          <SelectInput
            value={data.industry}
            onChange={(v) => set('industry', v)}
            placeholder="Select"
            options={INDUSTRIES}
          />
        </Field>
        <Field label="Team size">
          <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-slate-200/90 bg-white/85">
            {COMPANY_SIZES.map((size, i) => {
              const selected = data.company_size === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => set('company_size', selected ? '' : size)}
                  aria-pressed={selected}
                  className={cn(
                    'button-press h-11 text-[13px] font-semibold transition-colors',
                    i > 0 && 'border-l border-slate-200/90',
                    selected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100/70'
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
          {/* live visualisation of the selected size */}
          <AnimatePresence initial={false}>
            {data.company_size && SIZE_META[data.company_size] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pt-2.5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: SIZE_META[data.company_size].dots }).map((_, i) => (
                      <motion.span
                        key={`${data.company_size}-${i}`}
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.035, type: 'spring', stiffness: 400, damping: 22 }}
                        className="block h-2 w-2 rounded-full bg-slate-800"
                      />
                    ))}
                  </div>
                  <motion.span
                    key={SIZE_META[data.company_size].approx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[13px] font-semibold text-slate-600"
                  >
                    {SIZE_META[data.company_size].approx} people
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Field>
      </div>
    </>
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
    <div className={cn(cardCls, 'space-y-5 p-5')}>
      <Field label="Where does work happen?" required error={errors.work_model}>
        <div className="grid grid-cols-3 gap-2">
          {WORK_MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => set('work_model', m.value)}
              aria-pressed={data.work_model === m.value}
              className={cn(
                'button-press flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border text-sm font-semibold transition-all',
                data.work_model === m.value
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'border-slate-200/90 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {m.emoji}
              </span>
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Working days" required error={errors.work_days}>
        <div className="grid grid-cols-7 gap-1.5">
          {WORK_DAYS.map((d) => {
            const selected = data.work_days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                aria-pressed={selected}
                className={cn(
                  'button-press h-10 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all',
                  selected
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'border border-slate-200/90 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Day starts" required error={errors.work_start_time}>
          <input
            type="time"
            value={data.work_start_time}
            onChange={(e) => set('work_start_time', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Day ends" required error={errors.work_end_time}>
          <input
            type="time"
            value={data.work_end_time}
            onChange={(e) => set('work_end_time', e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Time zone">
        <div className="relative">
          <select
            value={data.timezone}
            onChange={(e) => set('timezone', e.target.value)}
            className={cn(inputCls, 'appearance-none pr-10')}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz} className="text-base text-slate-900">
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </Field>
    </div>
  );
}

/* ─────────────────────── step 3 — goals, tools, send ─────────────────────── */

const GOAL_ICONS = [ShieldCheck, Users, ClipboardList, Zap];

function TeamStep({
  data,
  errors,
  set,
}: {
  data: BetaSignupData;
  errors: FieldErrors;
  set: <K extends keyof BetaSignupData>(key: K, value: BetaSignupData[K]) => void;
}) {
  // Multi-select capped at three of four — a fourth attempt nudges instead of selects
  const [capHint, setCapHint] = useState(false);

  const toggleGoal = (goal: string) => {
    const selected = data.goals.includes(goal);
    if (!selected && data.goals.length >= 3) {
      setCapHint(true);
      return;
    }
    setCapHint(false);
    set('goals', selected ? data.goals.filter((g) => g !== goal) : [...data.goals, goal]);
  };

  return (
    <>
      {/* live summary of everything set so far */}
      <ConfigStrip data={data} />

      <div className={cn(cardCls, 'p-5')}>
        <Field label="What's the goal?" error={errors.goals}>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((goal, i) => {
              const Icon = GOAL_ICONS[i];
              const selected = data.goals.includes(goal);
              return (
                <motion.button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  aria-pressed={selected}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'flex h-28 flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition-all',
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
                      : 'border-slate-200/90 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      selected ? 'bg-white/15 text-white' : 'bg-slate-100/90 text-slate-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold leading-snug">{goal}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="min-h-5 pt-1.5">
            <AnimatePresence initial={false}>
              {capHint ? (
                <motion.p
                  key="cap"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium text-slate-500"
                >
                  Pick up to three — the ones that matter most.
                </motion.p>
              ) : (
                errors.goals && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-red-500"
                  >
                    {errors.goals}
                  </motion.p>
                )
              )}
            </AnimatePresence>
          </div>
        </Field>
      </div>

      <div className={cn(cardCls, 'space-y-4 p-5')}>
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

        <Field label="Anything else?">
          <textarea
            value={data.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Optional"
            className="w-full resize-none rounded-xl border border-slate-200/90 bg-white/85 px-3.5 py-2.5 text-base text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
          />
        </Field>
      </div>
    </>
  );
}
function ConfigStrip({ data }: { data: BetaSignupData }) {
  const model = WORK_MODELS.find((m) => m.value === data.work_model);
  const days = WORK_DAYS.filter((d) => data.work_days.includes(d.value));
  const dayLabel =
    days.length === 7 ? 'All week' : days.length === 5 && ['mon', 'tue', 'wed', 'thu', 'fri'].every((d) => data.work_days.includes(d))
      ? 'Mon–Fri'
      : days.map((d) => d.label).join(', ');
  const size = data.company_size && SIZE_META[data.company_size] ? `${SIZE_META[data.company_size].approx} people` : '';
  const items = [
    data.company_name,
    model && `${model.emoji} ${model.label}`,
    dayLabel,
    data.work_start_time && data.work_end_time && `${data.work_start_time}–${data.work_end_time}`,
    size,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <motion.span
          key={item}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          className="rounded-full border border-slate-200/90 bg-white/75 px-3 py-1 text-[13px] font-medium text-slate-600"
        >
          {item}
        </motion.span>
      ))}
    </div>
  );
}

/* ──────────────────────────── success screen ───────────────────────────── */

function SuccessScreen({ reference, email, name }: { reference: string; email: string; name: string }) {
  return (
    <div
      className="main-typography flex min-h-screen items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f7f8fb 45%, #edeef3 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto w-full max-w-md px-4 sm:px-6"
      >
        <div className="rounded-3xl border border-white/70 bg-white/60 p-8 text-center shadow-[0_16px_48px_rgba(15,23,42,0.09)] backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-900 text-white shadow-lg shadow-slate-900/25"
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.div>

          <h1 className="font-cal-sans mt-5 text-2xl font-semibold text-slate-900">
            You&rsquo;re on the list, {name}!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            A confirmation is headed to <span className="font-semibold text-slate-900">{email}</span>.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3">
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
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-[10px] font-bold text-slate-700">
                  {i + 1}
                </span>
                {line}
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-slate-200/70 pt-4 text-xs text-slate-400">
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
