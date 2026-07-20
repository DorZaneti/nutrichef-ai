import confetti from 'canvas-confetti';

// Brand gradient stops from theme.css (light + dark), used regardless of
// the active theme so the burst reads the same in both.
const BRAND_COLORS = ['#667eea', '#764ba2', '#818cf8', '#a78bfa'];

// A single brief confetti burst — never loops, never re-fires on its own.
// Callers are responsible for only invoking this once per real milestone.
export default function celebrate() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.3 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
    scalar: 0.9,
  });
}
