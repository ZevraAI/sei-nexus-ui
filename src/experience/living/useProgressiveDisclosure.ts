/** Zevra Experience Layer — useProgressiveDisclosure (Phase 3.4).
 *  A tiny interaction primitive (no motion, no business logic): open/close state + a11y wiring for
 *  "summary → expand for detail". Living cards use it to reveal rationale/lineage in place. */
import { useCallback, useId, useState } from 'react';

export interface Disclosure {
  open: boolean;
  toggle(): void;
  setOpen(open: boolean): void;
  /** Spread onto the trigger button. */
  triggerProps: { 'aria-expanded': boolean; 'aria-controls': string; onClick: () => void };
  /** Spread onto the collapsible content element. */
  contentProps: { id: string; hidden: boolean };
}

export function useProgressiveDisclosure(initialOpen = false): Disclosure {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return {
    open,
    toggle,
    setOpen,
    triggerProps: { 'aria-expanded': open, 'aria-controls': id, onClick: toggle },
    contentProps: { id, hidden: !open },
  };
}
