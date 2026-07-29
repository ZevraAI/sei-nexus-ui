/** Zevra Experience Layer — PreviewController (Phase 3.6, Layer A: no React).
 *  Owns the preview LIFECYCLE only: intent-dwell open, grace close, target switching, resolver
 *  calls, and Event Bus publication (PreviewOpened / PreviewClosed). No motion, no positioning, no
 *  business logic. Deterministic via the injected clock; leak-free via destroy(). */
import type { Clock } from '../clock';
import type { ExperienceEventBus } from '../events/ExperienceEventBus';
import type { EntityRef, Unsubscribe } from '../types';
import type { PreviewResolver } from './PreviewResolver';
import type { PreviewState, PreviewTarget } from './types';

const sameEntity = (a: EntityRef | null, b: EntityRef | null) =>
  !!a && !!b && a.kind === b.kind && a.id === b.id;

export interface PreviewControllerOptions {
  openDelayMs?: number;   // intent dwell before opening (anti-flicker)
  closeDelayMs?: number;  // grace before closing (allows transit into the panel)
}

const IDLE: PreviewState = { phase: 'idle', entity: null, rect: null, model: null };

export class PreviewController {
  private state: PreviewState = IDLE;
  private readonly listeners = new Set<() => void>();
  private pending: PreviewTarget | null = null;
  private openTimer: number | null = null;
  private closeTimer: number | null = null;
  private readonly openDelay: number;
  private readonly closeDelay: number;

  constructor(
    private readonly resolver: PreviewResolver,
    private readonly bus: ExperienceEventBus,
    private readonly clock: Clock,
    opts: PreviewControllerOptions = {},
  ) {
    this.openDelay = opts.openDelayMs ?? 300;
    this.closeDelay = opts.closeDelayMs ?? 180;
  }

  getState = (): PreviewState => this.state;
  subscribe = (cb: () => void): Unsubscribe => { this.listeners.add(cb); return () => this.listeners.delete(cb); };

  /** Hover/focus entered a preview target — open after the intent dwell. */
  requestOpen(target: PreviewTarget): void {
    this.cancelClose();
    if (this.state.phase === 'open' && sameEntity(this.state.entity, target.entity)) { this.pending = target; return; }
    if (this.pending && sameEntity(this.pending.entity, target.entity)) { this.pending = target; return; }
    this.clearOpen();
    this.pending = target;
    this.openTimer = this.clock.setTimeout(() => this.fireOpen(target), this.openDelay);
  }

  /** Hover/focus left — close after the grace period. */
  requestClose(): void {
    this.clearOpen();
    this.pending = null;
    if (this.state.phase !== 'open') return;
    if (this.closeTimer !== null) return;
    this.closeTimer = this.clock.setTimeout(() => this.fireClose(), this.closeDelay);
  }

  /** Keep an open preview alive (pointer moved into the panel). */
  cancelClose(): void {
    if (this.closeTimer !== null) { this.clock.clearTimeout(this.closeTimer); this.closeTimer = null; }
  }

  /** Immediate close (Escape / teardown). */
  closeNow(): void {
    this.clearOpen();
    this.cancelClose();
    this.pending = null;
    this.fireClose();
  }

  destroy(): void {
    this.clearOpen();
    this.cancelClose();
    this.listeners.clear();
    this.state = IDLE;
  }

  private async fireOpen(target: PreviewTarget): Promise<void> {
    this.openTimer = null;
    const model = await this.resolver.resolve(target.entity);
    if (this.pending !== target) return;                     // superseded during resolve
    const prev = this.state.phase === 'open' ? this.state.entity : null;
    this.setState({ phase: 'open', entity: target.entity, rect: target.rect, model });
    if (prev && !sameEntity(prev, target.entity)) this.bus.publish({ type: 'PreviewClosed', entity: prev });
    this.bus.publish({ type: 'PreviewOpened', entity: target.entity });
  }

  private fireClose(): void {
    this.closeTimer = null;
    if (this.state.phase !== 'open') return;
    const closing = this.state.entity;
    this.setState(IDLE);
    if (closing) this.bus.publish({ type: 'PreviewClosed', entity: closing });
  }

  private clearOpen(): void {
    if (this.openTimer !== null) { this.clock.clearTimeout(this.openTimer); this.openTimer = null; }
  }

  private setState(next: PreviewState): void {
    this.state = next;
    for (const cb of [...this.listeners]) cb();
  }
}
