import { useEffect, useRef, useState } from 'react';

// Animates a displayed integer toward `value` over `duration` ms whenever it
// changes, instead of snapping straight to the new number.
export default function useCountUp(value, duration = 500) {
  const [displayed, setDisplayed] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    if (from === value) return;

    const start = performance.now();
    cancelAnimationFrame(frameRef.current);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplayed(Math.round(from + (value - from) * progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return displayed;
}
