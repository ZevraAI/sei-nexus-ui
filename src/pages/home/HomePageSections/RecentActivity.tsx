/** Recent Activity — the "what changed overnight" ledger panel.
 *  Signature migration: a single panel (no own section label) so it can pair with the AI workforce
 *  panel inside one "Enterprise activity" row — matching signature-motif-home. Serif panel heading;
 *  LivingCard (Reveal) + LivingStatusDot (reduced-motion-aware). No animation code. */
import { LivingCard, LivingStatusDot, RevealPriority } from '../../../experience';
import type { ActivityVM } from '../HomePageViewModel';

export function RecentActivity({ items }: { items: ActivityVM[] }) {
  if (!items.length) {
    return (
      <LivingCard priority={RevealPriority.LOW} className="h-full">
        <h4 className="mb-4 font-z-serif text-z-h3 font-medium text-z-text">Enterprise activity</h4>
        <p className="text-z-body text-z-text-2 leading-[1.55]">
          No activity yet. Reasoning runs, anomalies, and alerts will appear here as Zevra observes your enterprise.
        </p>
      </LivingCard>
    );
  }
  return (
    <LivingCard priority={RevealPriority.LOW} className="h-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h4 className="font-z-serif text-z-h3 font-medium text-z-text">Completed analyses</h4>
        <span className="text-z-caption tabular-nums text-z-text-3">{items.length} completed</span>
      </div>
      <ul className="divide-y divide-z-border">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
            <LivingStatusDot status={it.tone} className="mt-1.5" />
            <div className="min-w-0 flex-1">
              <div className="text-z-body font-medium text-z-text">{it.title}</div>
              <div className="mt-0.5 text-z-caption text-z-text-3">{it.detail}</div>
            </div>
            <time className="text-z-caption tabular-nums text-z-text-3">{it.time}</time>
          </li>
        ))}
      </ul>
    </LivingCard>
  );
}
