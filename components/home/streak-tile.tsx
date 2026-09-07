'use client';

import { motion } from 'framer-motion';

interface StreakTileProps {
  current: number;
  best: number;
}

/** Gamified streak tile — solid brand fill so it pops next to the pod. */
export default function StreakTile({ current, best }: StreakTileProps) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-brand p-4 shadow-primary"
    >
      {/* soft highlight sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl"
      />
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
          Streak
        </span>
        <span className="text-lg" aria-hidden>
          🔥
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-[40px] font-bold leading-none tabular-nums text-white">
          {current}
          <span className="text-[22px] font-semibold text-white/85">d</span>
        </p>
        <div className="mt-3">
          <span className="inline-block rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90">
            🏅 Best {best}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
