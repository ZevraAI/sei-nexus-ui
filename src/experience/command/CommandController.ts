/** Zevra Experience Layer — CommandController (Phase 3.7, Layer A: no React).
 *  Owns INTERACTION only: session lifecycle, query, intent reflection, reasoning progression,
 *  streaming handoff, history, and Event Bus publication. Business understanding comes solely from
 *  the injected IntentInterpreter (Rule 3); navigation is a handoff seam (Rule: no routing).
 *  Context is read from a getContext() the provider derives from ExperienceContext. Leak-free. */
import type { Clock } from '../clock';
import type { ExperienceEventBus } from '../events/ExperienceEventBus';
import type { Unsubscribe } from '../types';
import type { IntentInterpreter } from './IntentInterpreter';
import type { CommandContext, CommandSessionState, Suggestion } from './types';

const REASONING_STEP_MS = 320;

const initial = (): CommandSessionState => ({
  open: false, phase: 'idle', query: '', intent: null, reasoningIndex: 0, currentRun: null, history: [],
});

export interface CommandControllerDeps {
  interpreter: IntentInterpreter;
  bus: ExperienceEventBus;
  clock: Clock;
  getContext: () => CommandContext;
  /** Navigation handoff seam — later phases connect real routing. */
  onNavigate?: (to: string) => void;
}

export class CommandController {
  private state = initial();
  private readonly listeners = new Set<() => void>();
  private reasoningTimer: number | null = null;
  private runToken = 0;

  constructor(private readonly deps: CommandControllerDeps) {}

  getState = (): CommandSessionState => this.state;
  subscribe = (cb: () => void): Unsubscribe => { this.listeners.add(cb); return () => this.listeners.delete(cb); };

  getSuggestions(): Suggestion[] {
    return this.deps.interpreter.suggest(this.deps.getContext());
  }

  open(seed?: string): void {
    if (this.state.open) { if (seed != null) this.setState({ query: seed }); return; }
    this.setState({ ...initial(), open: true, query: seed ?? '', history: this.state.history });
    this.deps.bus.publish({ type: 'CommandOpened' });
  }

  close(): void {
    if (!this.state.open) return;
    this.clearReasoning();
    this.runToken++;                       // invalidate any in-flight submit
    this.setState({ ...initial(), history: this.state.history });
    this.deps.bus.publish({ type: 'CommandClosed' });
  }

  toggle(seed?: string): void { this.state.open ? this.close() : this.open(seed); }

  setQuery(query: string): void { this.setState({ query }); }

  /** Interpret the query (reflect intent), then reason + stream. */
  async submit(): Promise<void> {
    const query = this.state.query.trim();
    if (!query || this.state.phase === 'thinking') return;
    const token = ++this.runToken;

    this.setState({ phase: 'thinking', intent: null, reasoningIndex: 0, currentRun: null });
    this.deps.bus.publish({ type: 'CommandSubmitted', query });

    const intent = await this.deps.interpreter.interpret(query, this.deps.getContext());
    if (token !== this.runToken) return;   // superseded / closed

    this.deps.bus.publish({ type: 'IntentRecognized', intent: intent.label });
    if (intent.kind === 'investigate') {
      this.deps.bus.publish({ type: 'InvestigationRequested', query, entity: intent.entity });
    }

    const hasSteps = !!intent.steps && intent.steps.length > 0;
    this.setState({
      intent,
      phase: hasSteps ? 'reasoning' : 'streaming',
      reasoningIndex: 0,
      currentRun: this.deps.interpreter.run(intent),
    });
    if (hasSteps) this.advanceReasoning(intent.steps!.length, token);
  }

  /** Called by StreamingRenderer's onDone. */
  finishStreaming(): void {
    if (this.state.phase !== 'streaming' && this.state.phase !== 'reasoning') return;
    const intent = this.state.intent;
    const history = intent
      ? [...this.state.history, { query: intent.raw, intentLabel: intent.label }]
      : this.state.history;
    this.setState({ phase: 'done', history });
    if (intent) this.deps.bus.publish({ type: 'CommandExecuted', intent: intent.label });
  }

  /** Navigation handoff (Enter on a navigable intent / "Open"). Seam only. */
  handoff(): void {
    const to = this.state.intent?.to;
    if (to && this.deps.onNavigate) this.deps.onNavigate(to);
    this.close();
  }

  destroy(): void {
    this.clearReasoning();
    this.listeners.clear();
    this.state = initial();
  }

  private advanceReasoning(count: number, token: number): void {
    const step = () => {
      if (token !== this.runToken) return;
      const next = this.state.reasoningIndex + 1;
      if (next >= count) { this.setState({ phase: 'streaming' }); return; }
      this.setState({ reasoningIndex: next });
      this.reasoningTimer = this.deps.clock.setTimeout(step, REASONING_STEP_MS);
    };
    this.reasoningTimer = this.deps.clock.setTimeout(step, REASONING_STEP_MS);
  }

  private clearReasoning(): void {
    if (this.reasoningTimer !== null) { this.deps.clock.clearTimeout(this.reasoningTimer); this.reasoningTimer = null; }
  }

  private setState(patch: Partial<CommandSessionState>): void {
    this.state = { ...this.state, ...patch };
    for (const cb of [...this.listeners]) cb();
  }
}
