'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, RefreshCw } from 'lucide-react';

interface Answers {
  weeklyPattern?: { choice?: string; confidence?: number };
  rhythmScore?: { score?: number; confidence?: number };
  lateStartRisk?: { noul?: number };
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

const PATTERN_LABELS: Record<string, string> = {
  steady: 'Steady rhythm',
  drifting_late: 'Drifting later',
  erratic: 'Erratic days',
  sparse: 'Sparse days',
};

const RAR = ['—', 'Very inconsistent', 'Fairly irregular', 'Mostly regular', 'Very consistent'];

/** Experimental: JEV-judged weekly rhythm card. Only rendered when the user
 *  opts in from the menu; fetches nothing until then. */
export default function DayInsightCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/ai/experimental/day-insight', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(
          data?.error === 'not_configured'
            ? 'Not configured — ask an admin to set the TypeSafe API key.'
            : data?.error || 'Could not judge right now.'
        );
        setStatus('error');
        return;
      }
      setAnswers(data.answers as Answers);
      setStatus('ready');
    } catch {
      setErrorMsg('Could not reach the insight service.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="card-solid rounded-2xl p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="card-label flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          Smart Day Insight
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            Experimental
          </span>
        </h3>
        <button
          onClick={load}
          disabled={status === 'loading'}
          className="p-1 rounded-lg text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          aria-label="Refresh insight"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {status === 'loading' && (
        <p className="text-sm text-muted-foreground">Judging your week…</p>
      )}

      {status === 'error' && <p className="text-sm text-muted-foreground">{errorMsg}</p>}

      {status === 'ready' && answers && (
        <div className="space-y-1.5">
          {answers.weeklyPattern?.choice && (
            <p className="text-sm text-foreground">
              Your week looks{' '}
              <span className="font-semibold">
                {PATTERN_LABELS[answers.weeklyPattern.choice] ?? answers.weeklyPattern.choice}
              </span>
              {typeof answers.weeklyPattern.confidence === 'number' && (
                <span className="text-xs text-muted-foreground">
                  {' '}
                  ({Math.round(answers.weeklyPattern.confidence * 100)}% sure)
                </span>
              )}
            </p>
          )}
          {typeof answers.rhythmScore?.score === 'number' && (
            <p className="text-sm text-foreground">
              Rhythm:{' '}
              <span className="font-semibold">
                {RAR[Math.min(4, Math.max(1, Math.round(answers.rhythmScore.score)))]}
              </span>
            </p>
          )}
          {typeof answers.lateStartRisk?.noul === 'number' && (
            <p className="text-sm text-foreground">
              {answers.lateStartRisk.noul >= 0.65
                ? '⚠️ A late start tomorrow looks likely — consider an earlier alarm.'
                : answers.lateStartRisk.noul <= 0.35
                  ? '✅ On track for a normal start next workday.'
                  : 'Start time tomorrow could go either way.'}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground pt-0.5">
            AI judgment over your last 14 days — a preview, not a record.
          </p>
        </div>
      )}
    </motion.div>
  );
}
