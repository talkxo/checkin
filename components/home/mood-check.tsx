'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface MoodCheckProps {
  onSubmit: (mood: string, comment: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const MOODS = [
  { emoji: '😅', value: 'challenging', label: 'Tough' },
  { emoji: '😐', value: 'okay', label: 'Okay' },
  { emoji: '🙂', value: 'good', label: 'Good' },
  { emoji: '😄', value: 'great', label: 'Great' },
];

/**
 * In-place checkout card — replaces the check-in pod right after the hold
 * completes. Tap a mood: it auto-submits and checks you out. No buttons,
 * no forms.
 */
export default function MoodCheck({ onSubmit, onClose, isSubmitting }: MoodCheckProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const done = picked !== null || isSubmitting;

  const pick = (value: string) => {
    if (done) return;
    setPicked(value);
    onSubmit(value, '');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="glass flex min-h-[252px] flex-col rounded-3xl border border-primary/30 p-4"
    >
      <h3 className="text-sm font-semibold text-foreground">How was your day?</h3>

      {/* 2×2 mood grid — bare emojis, one tap auto-submits */}
      <div className="grid flex-1 grid-cols-2 content-center gap-2">
        {MOODS.map((m) => {
          const active = picked === m.value;
          return (
            <button
              key={m.value}
              onClick={() => pick(m.value)}
              disabled={done}
              aria-label={m.label}
              className={`flex items-center justify-center py-2 text-[36px] transition-all duration-150 ${
                active ? 'scale-125' : done ? 'opacity-40' : 'opacity-75 hover:scale-110 hover:opacity-100'
              }`}
            >
              {m.emoji}
            </button>
          );
        })}
      </div>

      {done ? (
        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Checking out…
        </p>
      ) : (
        <button
          onClick={onClose}
          className="mx-auto mt-3 text-[10px] font-medium text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Not now
        </button>
      )}
    </motion.div>
  );
}
