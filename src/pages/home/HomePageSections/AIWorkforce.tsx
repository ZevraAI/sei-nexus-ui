/** AI Workforce — the standing agents panel.
 *  Signature migration: a single panel (no own section label, no stats card, no 3-up grid) that
 *  pairs with the activity ledger inside one "Enterprise activity" row — matching
 *  signature-motif-home. Serif panel heading + a crew list (Avatar + live status). LivingCard
 *  (Reveal) + LivingBadge (reduced-motion-aware). No animation code. */
import { Button } from '../../../ds';
import { LivingCard, LivingStatusDot, RevealPriority } from '../../../experience';
import type { WorkforceVM } from '../HomePageViewModel';

function go(to: string) {
  window.location.hash = to;
}

export function AIWorkforce({ workforce }: { workforce: WorkforceVM }) {
  if (!workforce.agents.length) {
    return (
      <LivingCard priority={RevealPriority.LOW} className="h-full">
        <div className="mb-4 flex items-baseline justify-between">
          <h4 className="font-z-serif text-z-h3 font-medium text-z-text">Enterprise coverage</h4>
          <Button variant="link" onClick={() => go(workforce.manageTo)}>Manage →</Button>
        </div>
        <p className="text-z-body text-z-text-2 leading-[1.55]">
          No AI agents have been deployed yet. Deploy your first Zevra Agent to begin autonomous
          monitoring and investigations.
        </p>
        <div className="mt-4">
          <Button size="sm" onClick={() => go(workforce.manageTo)}>Deploy your first agent</Button>
        </div>
      </LivingCard>
    );
  }
  return (
    <LivingCard priority={RevealPriority.LOW} accent="primary" className="h-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h4 className="font-z-serif text-z-h3 font-medium text-z-text">Enterprise coverage</h4>
        <Button variant="link" onClick={() => go(workforce.manageTo)}>View →</Button>
      </div>
      <ul className="flex flex-col">
        {workforce.agents.map((a) => (
          <li key={a.id} className="flex items-center gap-3 border-b border-z-border py-3 first:pt-0 last:border-0 last:pb-0">
            <LivingStatusDot status="resolved" className="shrink-0" />
            <span className="min-w-0 flex-1 text-z-body font-medium text-z-text">{a.name}</span>
            <span className="text-z-caption text-z-text-3">Reviewed</span>
          </li>
        ))}
      </ul>
    </LivingCard>
  );
}
