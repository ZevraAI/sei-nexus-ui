/** Zevra Experience Layer — reduced-motion detection (Runtime Invariant 6).
 *  Engines gate all motion on this; when true, motion collapses to instant final state. */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Current prefers-reduced-motion setting, reactive to OS changes. Safe in SSR/tests. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/** Imperative read (for non-React engine code). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}
