/** Zevra Experience Layer — useCommand (Phase 3.7). Imperative open/close for any page. */
import { useCommandController } from './CommandProvider';

export function useCommand(): { open(seed?: string): void; close(): void } {
  const c = useCommandController();
  return { open: (seed) => c.open(seed), close: () => c.close() };
}
