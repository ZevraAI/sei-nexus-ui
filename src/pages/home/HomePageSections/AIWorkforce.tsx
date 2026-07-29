/** AI Workforce — the standing agents panel.
 *  Signature migration: a single panel (no own section label, no stats card, no 3-up grid) that
 *  pairs with the activity ledger inside one "Enterprise activity" row — matching
 *  signature-motif-home. Serif panel heading + a crew list (Avatar + live status). LivingCard
 *  (Reveal) + LivingBadge (reduced-motion-aware). No animation code. */
import { Avatar, Button } from '../../../ds';
import { LivingCard, LivingBadge, RevealPriority } from '../../../experience';
import type { WorkforceVM } from '../HomePageViewModel';

function go(to: string) {
  window.location.hash = to;
}

export function AIWorkforce({ workforce }: { workforce: WorkforceVM }) {
  if (!workforce.agents.length) {
    return (
      <LivingCard priority={RevealPriority.LOW} className="h-full">
        <div className="mb-4 flex items-baseline justify-between">
          <h4 className="font-z-serif text-z-h3 font-medium text-z-text">Your AI workforce</h4>
          <Button variant="link" onClick={() => go(workforce.manageTo)}>Manage →</Button>
        </div>
        <p className="text-z-body text-z-text-2 leading-[1.55]">
          No agents are deployed yet. Deploy an agent to have Zevra investigate and monitor your data continuously.
        </p>
      </LivingCard>
    );
  }
  return (
    <LivingCard priority={RevealPriority.LOW} className="h-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h4 className="font-z-serif text-z-h3 font-medium text-z-text">Your AI workforce</h4>
        <Button variant="link" onClick={() => go(workforce.manageTo)}>Manage →</Button>
      </div>
      {workforce.stats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-x-8 gap-y-3 border-b border-z-border pb-4">
          {workforce.stats.map((s) => (
            <div key={s.label}>
              <div className={`text-z-h3 tabular-nums font-medium ${s.trend === 'up' ? 'text-z-up' : 'text-z-text'}`}>{s.value}</div>
              <div className="mt-0.5 text-z-caption text-z-text-3">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col">
        {workforce.agents.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-z-border py-3 first:pt-0 last:border-0 last:pb-0">
            <Avatar initials={a.initials} className="rounded-z-md" />
            <div className="min-w-0 flex-1">
              <div className="text-z-body font-medium text-z-text">{a.name}</div>
              <div className="mt-0.5 truncate text-z-caption text-z-text-3">{a.work}</div>
            </div>
            <LivingBadge status={a.status} dot live={a.live}>{a.statusLabel}</LivingBadge>
          </div>
        ))}
      </div>
    </LivingCard>
  );
}
