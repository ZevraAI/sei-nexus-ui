import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Spinner } from '../components/Card.jsx';
import { BrainCircuit, CheckCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { confidenceBand } from '../utils/confidence';

const STATUS_COLOR = {
  ACTIVE: 'blue', CONCLUDED: 'green', ABANDONED: 'gray',
  OPEN: 'yellow', RESOLVED: 'green', DISMISSED: 'gray',
};

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const d = await api.reasoning.session(session.sessionKey).catch(() => null);
        setDetail(d);
        setExpanded(true);
      } finally { setLoading(false); }
    } else {
      setExpanded(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <button onClick={toggle} className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0">
          {loading ? <Spinner size={3} /> : expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={session.status ?? 'ACTIVE'} color={STATUS_COLOR[session.status] ?? 'gray'} />
            {session.agentKey && <Badge label={session.agentKey} color="navy" />}
          </div>
          <p className="text-sm text-gray-700 mt-1 font-medium">{session.question}</p>
          <p className="text-xs text-gray-400 mt-0.5">{session.startedAt?.split('T')[0]}</p>

          {expanded && detail && (
            <div className="mt-3 space-y-2">
              {/* Steps */}
              {detail.steps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Investigation Steps</p>
                  <div className="space-y-1">
                    {detail.steps.map(s => (
                      <div key={s.stepKey} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                        <span className="text-xs font-mono text-gray-400 w-5 shrink-0">{s.stepNo}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700">{s.description}</p>
                          <p className="text-xs text-gray-400">{s.stepType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hypotheses */}
              {detail.hypotheses?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Hypotheses</p>
                  {detail.hypotheses.map(h => (
                    <div key={h.hypothesisKey} className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-blue-800">{h.hypothesisText}</p>
                      <p className="text-xs text-blue-500 mt-0.5">
                        {confidenceBand(Math.round((h.confidence ?? 0) * 100))} · {h.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Conclusion */}
              {session.conclusionSummary && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">Conclusion</p>
                  <p className="text-xs text-green-800">{session.conclusionSummary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// The backend serializes responses in snake_case; these views read camelCase — normalize once.
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
function deepCamel(x) {
  if (Array.isArray(x)) return x.map(deepCamel);
  if (x && typeof x === 'object') {
    const o = {};
    for (const k of Object.keys(x)) o[toCamel(k)] = deepCamel(x[k]);
    return o;
  }
  return x;
}
const hashParams = () => new URLSearchParams(window.location.hash.split('?')[1] || '');

export default function Reasoning() {
  const [sessions, setSessions] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => hashParams().get('tab') || 'sessions');
  const [highlight, setHighlight] = useState(() => hashParams().get('finding') || null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    Promise.all([
      api.reasoning.sessions().catch(() => []),
      api.reasoning.findings().catch(() => []),
    ]).then(([s, f]) => { setSessions(deepCamel(s ?? [])); setFindings(deepCamel(f ?? [])); })
      .finally(() => setLoading(false));
  }, []);

  // Deep-linked finding (homepage "Review finding"): open the findings tab, scroll the
  // finding into view and highlight it briefly.
  useEffect(() => {
    if (!highlight || loading) return;
    setTab('findings');
    const el = document.getElementById(`finding-${highlight}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlight(null), 2600);
    return () => clearTimeout(t);
  }, [highlight, loading]);

  const resolveFinding = async () => {
    if (!resolveModal) return;
    await api.reasoning.resolveFinding(resolveModal.findingKey, { status: 'RESOLVED', resolutionNote: resolveNote }).catch(() => {});
    setFindings(fs => fs.map(f => f.findingKey === resolveModal.findingKey ? { ...f, status: 'RESOLVED' } : f));
    setResolveModal(null);
    setResolveNote('');
  };

  return (
    <div className="h-full overflow-auto p-7 bg-transparent">
      <PageHeader
        title="Reasoning"
        subtitle="Investigation sessions, hypotheses, and operational findings"
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['sessions', 'Sessions'], ['findings', "Zevra's judgment"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : tab === 'sessions' ? (
        sessions.length === 0
          ? <EmptyState icon={BrainCircuit} title="No reasoning sessions" body="Sessions are created automatically when the chat engine investigates live data." />
          : <div className="space-y-2">{sessions.map(s => <SessionCard key={s.sessionKey} session={s} />)}</div>
      ) : (
        findings.length === 0
          ? <EmptyState icon={CheckCircle} title="No judgments yet" body="Zevra's judgment calls appear here once the reasoning engine concludes an investigation." />
          : <div className="space-y-2">
            {findings.map(f => (
              <div key={f.findingKey} id={`finding-${f.findingKey}`}>
              <Card className={`p-4 transition-shadow ${f.findingKey === highlight ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{f.title}</span>
                      <Badge label={f.status ?? 'OPEN'} color={STATUS_COLOR[f.status] ?? 'gray'} />
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{f.description}</p>
                    {f.recommendation && (
                      <p className="text-xs text-blue-600 mt-1">💡 {f.recommendation}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{(f.lastConfirmedAt ?? f.firstObservedAt)?.split('T')[0]}</p>
                  </div>
                  {f.status === 'OPEN' && (
                    <Btn variant="teal" size="sm" onClick={() => setResolveModal(f)}>
                      <CheckCircle size={13} /> Resolve
                    </Btn>
                  )}
                </div>
              </Card>
              </div>
            ))}
          </div>
      )}

      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve">
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{resolveModal?.title}</p>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Resolution note…"
            value={resolveNote}
            onChange={e => setResolveNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Btn>
            <Btn onClick={resolveFinding}>Mark Resolved</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
