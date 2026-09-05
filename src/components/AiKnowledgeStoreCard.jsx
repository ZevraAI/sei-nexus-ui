import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api.js';

// ── status presentation ────────────────────────────────────────────────────────

const STATUS = {
  IN_SYNC:         { label: 'In Sync',         dot: 'bg-emerald-500' },
  CHANGES_PENDING: { label: 'Changes Pending', dot: 'bg-amber-500' },
  SYNCING:         { label: 'Syncing…',        dot: 'bg-blue-500 animate-pulse' },
  FAILED:          { label: 'Sync Failed',     dot: 'bg-rose-500' },
  NOT_INITIALIZED: { label: 'Not Initialized', dot: 'bg-gray-300' },
};

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return null; }
}

/**
 * "AI Knowledge" / Vector Store synchronization status card — tenant ADMIN only. Shown only when
 * the caller has confirmed the current user is an ADMIN (see Settings.jsx). Never exposes internal
 * implementation names (ConceptKnowledgeMaterializationService, VectorStoreFile, concept_uid,
 * AzureOpenAiClient) — only Zevra-facing language: AI Knowledge, Concepts, Synchronized, Sync Now.
 */
export default function AiKnowledgeStoreCard() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.knowledge.vectorStore.status();
      setReport(r);
      return r;
    } catch (e) {
      // A tenant with no AI Knowledge feature enabled yet, or a transient error — fail quiet,
      // the card simply shows nothing rather than an alarming error banner on Settings.
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setSyncing(false);
  };

  const startPolling = () => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      const r = await fetchStatus();
      if (!r || r.status !== 'SYNCING' || attempts > 60) {
        stopPolling();
      }
    }, 2000);
  };

  const handleSyncNow = async () => {
    if (syncing) return; // guard against duplicate clicks
    setSyncing(true);
    setReport(prev => prev ? { ...prev, status: 'SYNCING' } : prev);
    try {
      await api.knowledge.vectorStore.sync();
      startPolling();
    } catch (e) {
      setSyncing(false);
      fetchStatus();
    }
  };

  if (loading || !report) return null;

  const status = STATUS[report.status] || STATUS.NOT_INITIALIZED;
  const lastSyncedLabel = fmtDate(report.lastSuccessfulSync);
  const pendingCount = report.pendingChangeCount || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <Sparkles size={17} className="text-violet-600" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-gray-900">AI Knowledge Store</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="text-[12.5px] font-semibold text-gray-600">{status.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.status === 'CHANGES_PENDING' && pendingCount > 0 && (
            <button onClick={() => setShowChanges(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              View Changes {showChanges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {(report.status === 'CHANGES_PENDING' || report.status === 'FAILED' || report.status === 'NOT_INITIALIZED') && (
            <button onClick={handleSyncNow} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold rounded-lg transition-all disabled:opacity-50">
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {report.status === 'FAILED' ? 'Try Again'
                : report.status === 'NOT_INITIALIZED' ? 'Initialize / Sync Now' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 text-[12.5px] text-gray-500 leading-relaxed">
        {report.status === 'IN_SYNC' && (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {lastSyncedLabel && <span>Last synchronized: <span className="text-gray-700 font-medium">{lastSyncedLabel}</span></span>}
            <span>Concepts: <span className="text-gray-700 font-medium">{report.totalConcepts}</span></span>
            <span>OpenAI Vector Store: <span className="text-emerald-600 font-medium">Connected</span></span>
          </div>
        )}

        {report.status === 'CHANGES_PENDING' && (
          <div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {lastSyncedLabel && <span>Last synchronized: <span className="text-gray-700 font-medium">{lastSyncedLabel}</span></span>}
              <span>Concepts: <span className="text-gray-700 font-medium">{report.totalConcepts}</span></span>
            </div>
            <p className="mt-1 text-gray-700 font-medium">
              {pendingCount} metadata change{pendingCount === 1 ? '' : 's'} {pendingCount === 1 ? 'is' : 'are'} not synchronized
            </p>
          </div>
        )}

        {report.status === 'SYNCING' && (
          <p>Synchronizing Concept Knowledge…</p>
        )}

        {report.status === 'FAILED' && (
          <div>
            <p>The last synchronization could not complete.</p>
            {lastSyncedLabel && <p className="mt-1">Last successful sync: <span className="text-gray-700 font-medium">{lastSyncedLabel}</span></p>}
          </div>
        )}

        {report.status === 'NOT_INITIALIZED' && (
          <p>This connection has an active industry Pack, but its Concept Knowledge has not yet been materialized.</p>
        )}
      </div>

      {showChanges && report.pendingChanges && report.pendingChanges.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Unsynchronized Metadata</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="font-medium pb-1.5 pr-4">Type</th>
                  <th className="font-medium pb-1.5 pr-4">Name</th>
                  <th className="font-medium pb-1.5">Changed</th>
                </tr>
              </thead>
              <tbody>
                {report.pendingChanges.map((c, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="py-1.5 pr-4 text-gray-500">{c.type}</td>
                    <td className="py-1.5 pr-4 text-gray-800 font-medium">{c.name}</td>
                    <td className="py-1.5 text-gray-500">{fmtDate(c.changedAt) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
