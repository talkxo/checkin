import confetti from 'canvas-confetti';

// Brand colors
const BRAND_COLORS = ['#5cfaad', '#5ff1f5', '#ffffff', '#a0fdd8'];

/**
 * Big celebration — check-in on time or early
 * Full confetti burst from the bottom center
 */
export function fireCheckInConfetti() {
  confetti({
    particleCount: 80,
    spread: 80,
    origin: { y: 0.7 },
    colors: BRAND_COLORS,
    scalar: 0.9,
    gravity: 1.1,
  });
}

/**
 * Emoji blast — on-time / early check-in bonus celebration
 * Fires star & party emojis from the button area
 */
export function fireOnTimeEmojis() {
  const emojis = ['⭐', '🎉', '🔥', '💪'];
  const defaults = {
    origin: { y: 0.7 },
    gravity: 0.8,
    ticks: 80,
    scalar: 1.6,
    drift: 0,
  };

  emojis.forEach((emoji, i) => {
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 1,
        spread: 50 + i * 15,
        shapes: ['circle'],
        colors: [BRAND_COLORS[i % BRAND_COLORS.length]],
      });
    }, i * 80);
  });

  // Second wave — wider spread
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { y: 0.65 },
      colors: BRAND_COLORS,
      scalar: 0.7,
      gravity: 1.3,
    });
  }, 300);
}

/**
 * Gentle check-out celebration
 */
export function fireCheckOutConfetti() {
  confetti({
    particleCount: 35,
    spread: 55,
    origin: { y: 0.75 },
    colors: ['#5cfaad', '#5ff1f5'],
    scalar: 0.6,
    gravity: 1.5,
  });
}

/**
 * Late check-in — no confetti, just a subtle single puff
 * Acknowledges the action without big celebration
 */
export function fireLateCheckInPuff() {
  confetti({
    particleCount: 8,
    spread: 30,
    origin: { y: 0.75 },
    colors: ['#fbbf24', '#f59e0b'], // amber
    scalar: 0.5,
    gravity: 2,
    ticks: 40,
  });
}

/**
 * Plan saved celebration — short green burst
 */
export function firePlanSavedConfetti() {
  // Left burst
  confetti({
    particleCount: 30,
    angle: 60,
    spread: 45,
    origin: { x: 0.2, y: 0.7 },
    colors: BRAND_COLORS,
    scalar: 0.7,
    gravity: 1.4,
  });
  // Right burst
  confetti({
    particleCount: 30,
    angle: 120,
    spread: 45,
    origin: { x: 0.8, y: 0.7 },
    colors: BRAND_COLORS,
    scalar: 0.7,
    gravity: 1.4,
  });
}

/**
 * Streak milestone celebration — fires when streak hits 5, 10, 15, etc.
 */
export function fireStreakMilestone() {
  const end = Date.now() + 600;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: BRAND_COLORS,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: BRAND_COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
