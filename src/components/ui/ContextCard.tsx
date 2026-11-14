import { useState } from 'react';
import { ChevronUp, ChevronRight } from 'lucide-react';
import type { InvestigationContext, ContextField } from '../../types';
import { cn } from '../../utils/cn';

function ContextRow({ field }: { field: ContextField }) {
  const Icon = field.icon;
  const isAgent = field.version !== undefined || field.isOnline !== undefined;
  const hasLink = Boolean(field.linkLabel);
  const isConfidential = field.pillVariant === 'confidential';
  const isPending = field.pillVariant === 'pending';

  return (
    <div className="grid grid-cols-[96px_24px_1fr] items-start gap-4 px-0 py-6">
      <dt className="text-z-body leading-tight text-z-text-2">{field.label}</dt>
      <dd className="contents">
        <Icon className="w-5 h-5 text-[#59616B] mt-0.5 stroke-[1.8]" aria-hidden="true" />
        <div className="min-w-0">
          {isAgent && (
            <div className="flex flex-col items-end gap-1">
              <p className="text-z-body font-semibold text-accent leading-tight">{field.value}</p>
              <div className="flex items-center gap-5">
                {field.version && <span className="text-z-body-sm text-z-text-3">{field.version}</span>}
                {field.isOnline !== undefined && (
                  <span className="flex items-center gap-2 text-z-body-sm text-ok">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-ok" />
                    Online
                  </span>
                )}
              </div>
            </div>
          )}

          {hasLink && (
            <div className="flex flex-col items-end gap-2">
              <p className="text-z-body font-semibold text-accent leading-tight">{field.value}</p>
              <button type="button" className="inline-flex items-center gap-2 text-z-body-sm text-accent hover:underline">
                {field.linkLabel}
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {field.pillVariant && (
            <div className="flex justify-end">
              <span
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-z-body-sm font-medium',
                  isConfidential && 'bg-[#EEF2EF] text-accent border border-[#DDE6E2]',
                  isPending && 'bg-[#EAF4FB] text-[#277DAD]'
                )}
              >
                {field.value}
                {isConfidential && <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />}
              </span>
            </div>
          )}
        </div>
      </dd>
    </div>
  );
}

interface ContextCardProps {
  context: InvestigationContext;
  className?: string;
}

export function ContextCard({ context, className }: ContextCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section
      aria-labelledby="context-card-label"
      className={cn('bg-z-card border border-z-border rounded-[8px] shadow-sm px-6', className)}
    >
      <div className="flex items-center justify-between py-6 border-b border-z-border">
        <h2 id="context-card-label" className="text-z-lead font-semibold text-z-text">
          {context.title}
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="context-card-body"
          aria-label={collapsed ? 'Expand context' : 'Collapse context'}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-xs',
            'text-[#4B5563] hover:text-z-text hover:bg-z-hover transition-colors'
          )}
        >
          <ChevronUp className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      {!collapsed && (
        <div id="context-card-body">
          <dl className="divide-y divide-line">
            {context.fields.map((field) => (
              <ContextRow key={field.id} field={field} />
            ))}
          </dl>

          <div className="py-5 border-t border-z-border">
            <button
              type="button"
              className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-[6px] border border-z-border bg-z-card text-z-body-sm font-medium text-z-text hover:bg-z-card-2"
            >
              View full context
              <ChevronRight className="w-5 h-5 text-accent" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
