import { CommandBar } from '../components/ui/CommandBar';
import { ActionTile } from '../components/ui/ActionTile';
import { InvestigationTable } from '../components/ui/InvestigationTable';
import { actionTiles } from '../data/actions';
import { investigations, totalInvestigations } from '../data/investigations';

export function InvestigationsPage() {
  return (
    <div className="px-10 lg:px-[68px] pt-[46px] pb-10 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-z-display-lg leading-[1.1] font-semibold text-z-text">
          Investigations
        </h1>
        <p className="mt-2 text-z-lead text-z-text-2">
          Uncover insights, follow leads, and drive actions across systems and data.
        </p>
      </div>

      <div className="mb-7">
        <CommandBar />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {actionTiles.map((tile) => (
          <ActionTile key={tile.id} tile={tile} />
        ))}
      </div>

      <InvestigationTable
        investigations={investigations}
        totalCount={totalInvestigations}
      />
    </div>
  );
}
