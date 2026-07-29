/** Zevra Experience Layer — IntentInterpreter (Phase 3.7, business-logic boundary — Rule 3).
 *  ALL enterprise understanding enters through this. The runtime never understands business concepts
 *  itself. A real interpreter (LLM/AgentBrain over governed data) is injected later;
 *  `MockIntentInterpreter` powers dev/tests deterministically. */
import type { CommandContext, Intent, Suggestion } from './types';

export interface IntentInterpreter {
  /** Contextual suggestions before a keystroke (opens "already knowing"). */
  suggest(ctx: CommandContext): Suggestion[];
  /** Interpret the user's text into a structured, reflectable Intent. */
  interpret(text: string, ctx: CommandContext): Promise<Intent>;
  /** Stream the answer for an Intent (consumed by StreamingRenderer). */
  run(intent: Intent): AsyncIterable<string>;
}

function topic(text: string): string {
  const m = /\b(inventory|margin|invoice|shrink|sales|supplier|store|revenue)\b/i.exec(text);
  return m ? m[1].toLowerCase() : 'the enterprise';
}

/** Deterministic, representative interpreter. No network, no LLM. */
export class MockIntentInterpreter implements IntentInterpreter {
  suggest(ctx: CommandContext): Suggestion[] {
    const base: Suggestion[] = [
      { id: 'inv', label: 'Investigate the Southwest inventory drop', seed: 'Investigate why inventory fell in the Southwest' },
      { id: 'sum', label: 'Summarize this week for the board', seed: 'Summarize this week for the board' },
      { id: 'agents', label: 'Show what my agents found overnight', seed: 'What did my agents find overnight' },
    ];
    if (ctx.activeInvestigation) {
      base.unshift({ id: 'explain', label: 'Explain this investigation', seed: 'Explain the current investigation' });
    }
    return base;
  }

  interpret(text: string, _ctx: CommandContext): Promise<Intent> {
    const t = text.toLowerCase();
    if (/investig|why|root cause|explain why/.test(t)) {
      return Promise.resolve({
        kind: 'investigate', raw: text, to: '/reasoning',
        label: `Investigate → ${topic(text)} · governed`,
        steps: [
          { title: 'Scope the movement', detail: 'Isolating stores and time window' },
          { title: 'Find the concentration' },
          { title: 'Trace to inbound' },
        ],
      });
    }
    if (/summar|brief/.test(t)) {
      return Promise.resolve({ kind: 'summarize', raw: text, to: '/brief', label: 'Summarize → this week · executive brief' });
    }
    if (/explain/.test(t)) {
      return Promise.resolve({ kind: 'explain', raw: text, label: `Explain → ${topic(text)} · governed` });
    }
    return Promise.resolve({ kind: 'answer', raw: text, label: `Answer → ${topic(text)} · governed` });
  }

  async *run(_intent: Intent): AsyncIterable<string> {
    yield 'Reasoning over governed business data. ';
    yield 'The Southwest decline traces to a missed inbound from a single supplier — ';
    yield 'not demand or shrink. Confidence 91%.';
  }
}
