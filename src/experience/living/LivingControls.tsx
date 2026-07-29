/** Zevra Experience Layer — Living controls (Phase 3.4).
 *  Thin runtime-aware wrappers around frozen DS controls. LivingStatusDot/LivingBadge propagate
 *  reduced-motion (the heartbeat/pulse stops honestly). LivingSearch/LivingButton are stable seams
 *  the Command (3.7) and feedback phases enhance later — passthrough today, no call-site churn then. */
import { Badge, StatusDot, Search, Button } from '../../ds';
import type { BadgeProps, StatusDotProps, SearchProps, ButtonProps } from '../../ds';
import { useReducedMotion } from '../a11y/useReducedMotion';

/** StatusDot with reduced-motion-aware liveness — the canonical heartbeat unit. */
export function LivingStatusDot({ live, ...rest }: StatusDotProps) {
  const reduced = useReducedMotion();
  return <StatusDot live={!!live && !reduced} {...rest} />;
}

/** Badge whose live pulse honors reduced-motion. */
export function LivingBadge({ live, ...rest }: BadgeProps) {
  const reduced = useReducedMotion();
  return <Badge live={!!live && !reduced} {...rest} />;
}

/** Search seam — native focus today; the Command Experience (3.7) enhances this in place. */
export function LivingSearch(props: SearchProps) {
  return <Search {...props} />;
}

/** Button seam — DS press/loading states are already token-driven; runtime feedback lands later. */
export function LivingButton(props: ButtonProps) {
  return <Button {...props} />;
}
