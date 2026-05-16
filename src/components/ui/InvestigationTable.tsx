import { useState } from 'react';
import { Folder, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Investigation } from '../../types';
import { StatusPill } from './StatusPill';
import { cn } from '../../utils/cn';

const avatarClass = 'bg-[#EEEEED] text-[#4B5563]';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date}  ${time}`;
}

interface InvestigationTableProps {
  investigations: Investigation[];
  totalCount?: number;
  className?: string;
}

export function InvestigationTable({
  investigations,
  totalCount = investigations.length,
  className,
}: InvestigationTableProps) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.ceil(totalCount / perPage);
  const visiblePages = [1, 2, 3, 4, 5].filter((p) => p <= totalPages);

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalCount);

  return (
    <section aria-labelledby="investigations-table-label" className={className}>
      <div className="flex items-center justify-between mb-2">
        <h2
          id="investigations-table-label"
          className="text-[20px] font-semibold text-foreground"
        >
          Recent investigations
        </h2>
      </div>

      <div className="border border-line rounded-[6px] overflow-hidden bg-surface shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm border-collapse" aria-label="Recent investigations">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th scope="col" className="px-5 py-3 text-left text-[13px] font-medium text-dim-fg w-auto">
                  Investigation
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[13px] font-medium text-dim-fg w-56">
                  Owner
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[13px] font-medium text-dim-fg w-44">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[13px] font-medium text-dim-fg w-56">
                  <button type="button" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                    Updated
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </th>
                <th scope="col" className="px-5 py-3 w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {investigations.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-muted transition-colors group">
                  <td className="px-5 py-[13px]">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-accent flex-shrink-0 stroke-[1.7]" aria-hidden="true" />
                      <a
                        href={`/investigations/${inv.id}`}
                        className={cn(
                          'text-[14px] text-foreground font-medium',
                          'group-hover:text-accent transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-accent focus-visible:rounded-xs'
                        )}
                      >
                        {inv.title}
                      </a>
                    </div>
                  </td>
                  <td className="px-5 py-[13px]">
                    <div className="flex items-center gap-2.5">
                      <div
                        aria-hidden="true"
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-medium',
                          avatarClass
                        )}
                      >
                        {inv.ownerInitials}
                      </div>
                      <span className="text-[14px] text-muted-fg whitespace-nowrap">
                        {inv.owner}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-[13px]">
                    <StatusPill status={inv.status} />
                  </td>
                  <td className="px-5 py-[13px] text-[14px] text-muted-fg whitespace-nowrap tabular-nums">
                    {formatDateTime(inv.updatedAt)}
                  </td>
                  <td className="px-5 py-[13px]">
                    <button
                      type="button"
                      aria-label={`More options for ${inv.title}`}
                      className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-xs',
                        'text-[#4B5563] hover:bg-item-hover hover:text-foreground',
                        'transition-all'
                      )}
                    >
                      <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-line bg-surface">
          <span className="text-[13px] text-muted-fg tabular-nums">
            {startItem}-{endItem} of {totalCount}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-[6px] text-[14px]',
                'bg-surface border border-transparent hover:bg-item-hover transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>

            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-center w-10 h-9 rounded-[6px] text-[14px]',
                  'border transition-colors',
                  p === page
                    ? 'bg-accent text-surface border-accent font-medium shadow-sm'
                    : 'bg-surface border-transparent text-muted-fg hover:bg-item-hover'
                )}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-[6px] text-[14px]',
                'bg-surface border border-transparent hover:bg-item-hover transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-muted-fg">
            Show
            <select
              aria-label="Rows per page"
              className={cn(
                'h-8 px-3 text-[13px] rounded-[6px]',
                'bg-surface border border-line text-muted-fg',
                'focus:outline-none focus:border-accent'
              )}
              defaultValue={perPage}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            per page
          </div>
        </div>
      </div>
    </section>
  );
}
