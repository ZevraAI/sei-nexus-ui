/** Zevra Experience Layer — React hook to subscribe to the Event Bus with auto-teardown. */
import { useEffect, useRef } from 'react';
import { useExperienceBus } from '../context/ExperienceContext';
import type { ExperienceEventType, EventOf, ExperienceEvent } from './events';

export function useExperienceEvents<T extends ExperienceEventType>(
  type: T | '*',
  handler: (e: T extends ExperienceEventType ? EventOf<T> : ExperienceEvent) => void,
): void {
  const bus = useExperienceBus();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => bus.subscribe(type, (e) => ref.current(e as never)), [bus, type]);
}
