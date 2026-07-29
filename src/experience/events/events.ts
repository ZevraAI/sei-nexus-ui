/** Zevra Experience Layer — the Experience Event union (§9.1b).
 *  The ONLY vocabulary engines use to communicate. Designed to be telemetry- and
 *  attention-complete: Telemetry and Attention are pure Bus subscribers. */
import type { EntityRef, PulseState } from '../types';

export type ExperienceEvent =
  | { type: 'PulseUpdated'; state: PulseState }
  | { type: 'PulseStatusChanged'; from: PulseState['status']; to: PulseState['status'] }
  | { type: 'PulseFreshnessChanged'; freshness: number }
  | { type: 'ConfidenceChanged'; target: EntityRef; from: number; to: number }
  | { type: 'InvestigationStarted'; id: string; origin?: EntityRef }
  | { type: 'PreviewOpened'; entity: EntityRef }
  | { type: 'PreviewClosed'; entity: EntityRef }
  | { type: 'RecommendationGenerated'; id: string }
  | { type: 'CommandOpened' }
  | { type: 'CommandClosed' }
  | { type: 'CommandSubmitted'; query: string }
  | { type: 'IntentRecognized'; intent: string }
  | { type: 'InvestigationRequested'; query: string; entity?: EntityRef }
  | { type: 'CommandExecuted'; intent: string }
  | { type: 'RevealCompleted'; surface: string }
  | { type: 'ActivityInserted'; channel: string; id: string }
  | { type: 'EmphasisRequested'; source: string; priority: number };

export type ExperienceEventType = ExperienceEvent['type'];

/** Narrow an event by its type tag. */
export type EventOf<T extends ExperienceEventType> = Extract<ExperienceEvent, { type: T }>;
