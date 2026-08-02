/** Zevra Experience Layer — Motion token resolution (Invariant 1: tokens are the only timing).
 *  Reads --z-dur-* / --z-ease-* from CSS at runtime; falls back to the constant mirror of
 *  tokens.css when no document exists (Node/tests). No engine reads CSS except through here. */
import type { PresetName, MotionKeyframe } from './types';

export type DurationName = 'instant' | 'fast' | 'base' | 'slow' | 'deliberate';
export type EasingName = 'standard' | 'entrance' | 'exit';

export interface MotionTokens {
  dur: Record<DurationName, number>;
  ease: Record<EasingName, string>;
}

/** Constant mirror of tokens.css (used when CSS is unavailable). */
export const FALLBACK_TOKENS: MotionTokens = {
  dur: { instant: 80, fast: 140, base: 220, slow: 360, deliberate: 560 },
  ease: {
    standard: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    entrance: 'cubic-bezier(0.16, 0.84, 0.24, 1)',
    exit: 'cubic-bezier(0.4, 0, 0.9, 0.5)',
  },
};

function readCssMs(name: string): number | null {
  if (typeof window === 'undefined' || !window.getComputedStyle) return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return null;
  const m = /^([\d.]+)(ms|s)?$/.exec(raw);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === 's' ? n * 1000 : n;
}

function readCssStr(name: string): string | null {
  if (typeof window === 'undefined' || !window.getComputedStyle) return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || null;
}

/** Resolve tokens once; CSS wins, constants fill gaps. Optional overrides for tests. */
export function resolveMotionTokens(overrides?: Partial<MotionTokens>): MotionTokens {
  const dur: Record<DurationName, number> = { ...FALLBACK_TOKENS.dur };
  const ease: Record<EasingName, string> = { ...FALLBACK_TOKENS.ease };
  (Object.keys(dur) as DurationName[]).forEach((k) => { const v = readCssMs(`--z-dur-${k}`); if (v != null) dur[k] = v; });
  (Object.keys(ease) as EasingName[]).forEach((k) => { const v = readCssStr(`--z-ease-${k}`); if (v) ease[k] = v; });
  return { dur: { ...dur, ...overrides?.dur }, ease: { ...ease, ...overrides?.ease } };
}

/** Motion presets — the keyframe mirror of the tokens.css @keyframes. */
export const PRESETS: Record<PresetName, MotionKeyframe[]> = {
  rise: [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
  riseScale: [{ opacity: 0, transform: 'translateY(-12px) scale(0.98)' }, { opacity: 1, transform: 'none' }],
  fillWidth: [{ width: '0%' }, { width: '100%' }],
  pulseRing: [{ transform: 'scale(1)', opacity: 0.5 }, { transform: 'scale(2.4)', opacity: 0 }],
};
