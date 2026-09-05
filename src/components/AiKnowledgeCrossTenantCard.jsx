import { useCallback, useEffect, useState } from 'react';
import { Globe2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api.js';

// Same status vocabulary as the tenant-facing AiKnowledgeStoreCard — kept as a small local copy
// (rather than a shared import) since the two cards intentionally never share state/props.
const STATUS = {
  IN_SYNC:         { label: 'In Sync',         color: 'text-emerald-700 bg-emerald-50' },
  CHANGES_PENDING: { label: 'Changes Pending', color: 'text-amber-700 bg-amber-50' },
  SYNCING:         { label: 'Syncing…',        color: 'text-blue-700 bg-blue-50' },
  FAILED:          { label: 'Failed',          color: 'text-rose-700 bg-rose-50' },
  NOT_INITIALIZED: { label: 'Not Initialized', color: 'text-gray-600 bg-gray-100' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return '—'; }
}

/**
 * "AI Knowledge Synchronization" — Zevra/platform-ADMIN-only cross-tenant view. Shown only when
 * the caller has confirmed the current user is a platform admin (see Settings.jsx's isPlatformAdmin
 * gate — the backend independently enforces the same role+public-schema check on every call here).
 * Never exposes internal implementation names — only tenant name, sync status, timestamps, and
 * counts.
 */
export default function AiKnowledgeCrossTenantCard() {
  const [rows, setRows]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // tenantSlug currently showing its pending list
  const [pendingBySlug, setPendingBySlug] = useState({});
  const [syncingSlug, setSyncingSlug] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.knowledge.vectorStore.platform.list();
      setRows(r);
    } catch (e) {
      setRows(null); // not a platform admin, or a transient error — card shows nothing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (tenantSlug) => {
    if (expanded === tenantSlug) { setExpanded(null); return; }
    setExpanded(tenantSlug);
    if (!pendingBySlug[tenantSlug]) {
      try {
        const detail = await api.knowledge.vectorStore.platform.pending(tenantSlug);
        setPendingBySlug(prev => ({ ...prev, [tenantSlug]: detail.pendingChanges || [] }));
      } catch (e) {
        setPendingBySlug(prev => ({ ...prev, [tenantSlug]: [] }));
      }
    }
  };

  const handleSync = async (tenantSlug) => {
    if (syncingSlug) return;
    setSyncingSlug(tenantSlug);
    try {
      await api.knowledge.vectorStore.platform.sync(tenantSlug);
      // Poll once after a short delay rather than a tight loop — this is an admin oversight view,
      // not the tenant's own real-time card.
      setTimeout(async () => { await load(); setSyncingSlug(null); }, 3000);
    } catch (e) {
      setSyncingSlug(null);
    }
  };

  if (loading || !rows) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
          <Globe2 size={17} className="text-violet-600" />
        </div>
        <p className="text-[14px] font-bold text-gray-900">AI Knowledge Synchronization</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12.5px] text-gray-400">No tenants with AI Knowledge configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="font-medium pb-2 pr-4">Tenant</th>
                <th className="font-medium pb-2 pr-4">Status</th>
                <th className="font-medium pb-2 pr-4">Last Sync</th>
                <th className="font-medium pb-2 pr-4">Pending</th>
                <th className="font-medium pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const st = STATUS[row.status] || STATUS.NOT_INITIALIZED;
                const isExpanded = expanded === row.tenantSlug;
                return (
                  <>
                    <tr key={row.tenantSlug} className="border-t border-gray-50">
                      <td className="py-2 pr-4 text-gray-800 font-medium">{row.tenantName}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{fmtDate(row.lastSuccessfulSync)}</td>
                      <td className="py-2 pr-4 text-gray-600">{row.pendingChangeCount ?? 0}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {row.pendingChangeCount > 0 && (
                          <button onClick={() => toggleExpand(row.tenantSlug)}
                            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 font-medium mr-3">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} View
                          </button>
                        )}
                        <button onClick={() => handleSync(row.tenantSlug)} disabled={syncingSlug === row.tenantSlug}
                          className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 font-semibold disabled:opacity-50">
                          <RefreshCw size={12} className={syncingSlug === row.tenantSlug ? 'animate-spin' : ''} />
                          Sync Now
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={row.tenantSlug + '-detail'} className="bg-gray-50/60">
                        <td colSpan={5} className="px-4 py-3">
                          {(pendingBySlug[row.tenantSlug] || []).length === 0 ? (
                            <p className="text-gray-400">Loading…</p>
                          ) : (
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-gray-400">
                                  <th className="font-medium pb-1 pr-4">Type</th>
                                  <th className="font-medium pb-1 pr-4">Name</th>
                                  <th className="font-medium pb-1">Changed</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pendingBySlug[row.tenantSlug].map((c, i) => (
                                  <tr key={i}>
                                    <td className="py-1 pr-4 text-gray-500">{c.type}</td>
                                    <td className="py-1 pr-4 text-gray-800 font-medium">{c.name}</td>
                                    <td className="py-1 text-gray-500">{fmtDate(c.changedAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
