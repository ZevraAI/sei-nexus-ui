import { AppShell } from './components/layout/AppShell';
import { InvestigationsPage } from './pages/InvestigationsPage';
import { ContextCard } from './components/ui/ContextCard';
import { investigationContext } from './data/context';

export default function App() {
  return (
    <AppShell
      rightPanel={
        <div className="px-6 py-7">
          <ContextCard context={investigationContext} />
        </div>
      }
    >
      <InvestigationsPage />
    </AppShell>
  );
}
