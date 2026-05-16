import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Textarea, Spinner } from '../components/Card.jsx';
import { AlertTriangle, CheckCircle, XCircle, Database } from 'lucide-react';

const STATUS_COLOR = { OPEN: 'yellow', RESOLVED: 'green', DISMISSED: 'gray' };
const TYPE_COLOR = {
  MISSING_KNOWLEDGE: 'red',
  KNOWLEDGE_PROPOSAL: 'blue',
  SOURCE_REQUEST: 'teal',
};
const TYPE_ICON = {
  MISSING_KNOWLEDGE: AlertTriangle,
  KNOWLEDGE_PROPOSAL: CheckCircle,
  SOURCE_REQUEST: Database,
};

export default function KnowledgeGaps() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveDoc, setResolveDoc] = useState('');
  const [sourceModal, setSourceModal] = useState(null);
  const [sourceConn, setSourceConn] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.gaps.list().then(setGaps).catch(() => setGaps([])).finally(() => setLoading(false));
  }, []);

  const filtered = gaps.filter(g => filter === 'ALL' || g.status === filter);

  const dismiss = async (key) => {
    await api.gaps.dismiss(key).catch(() => {});
    setGaps(gs => gs.map(g => g.gapKey === key ? { ...g, status: 'DISMISSED' } : g));
  };

  const resolve = async () => {
    if (!resolveModal) return;
    setSaving(true);
    await api.gaps.resolve(resolveModal.gapKey, { documentTitle: resolveDoc }).catch(() => {});
    setGaps(gs => gs.map(g => g.gapKey === resolveModal.gapKey ? { ...g, status: 'RESOLVED' } : g));
    setResolveModal(null);
    setResolveDoc('');
    setSaving(false);
  };

  const resolveSource = async () => {
    if (!sourceModal) return;
    setSaving(true);
    await api.gaps.resolveSource(sourceModal.gapKey, { connectionKey: sourceConn }).catch(() => {});
    setGaps(gs => gs.map(g => g.gapKey === sourceModal.gapKey ? { ...g, status: 'RESOLVED' } : g));
    setSourceModal(null);
    setSourceConn('');
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <PageHeader
        title="Knowledge Gaps"
        subtitle="Track and resolve unanswered questions, proposals, and source requests"
        actions={
          <div className="flex gap-1">
            {['ALL', 'OPEN', 'RESOLVED', 'DISMISSED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                  ${filter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No knowledge gaps" body="Gaps are recorded when the system can't answer a question from approved sources." />
      ) : (
        <div className="space-y-2">
          {filtered.map(g => {
            const Icon = TYPE_ICON[g.gapType] ?? AlertTriangle;
            return (
              <Card key={g.gapKey} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${g.gapType === 'MISSING_KNOWLEDGE' ? 'bg-red-50' : g.gapType === 'SOURCE_REQUEST' ? 'bg-teal-50' : 'bg-blue-50'}`}>
                    <Icon size={16} className={
                      g.gapType === 'MISSING_KNOWLEDGE' ? 'text-red-500'
                      : g.gapType === 'SOURCE_REQUEST' ? 'text-teal-600' : 'text-blue-600'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge label={g.gapType?.replace(/_/g, ' ')} color={TYPE_COLOR[g.gapType] ?? 'gray'} />
                      <Badge label={g.status ?? 'OPEN'} color={STATUS_COLOR[g.status] ?? 'gray'} />
                    </div>
                    <p className="text-sm text-gray-800 mt-1 font-medium">{g.question}</p>
                    {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                    {g.proposedContent && (
                      <p className="text-xs text-blue-600 mt-0.5 italic">Proposed: {g.proposedContent}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{g.detectedAt?.split('T')[0]}</p>
                  </div>
                  {g.status === 'OPEN' && (
                    <div className="flex gap-1 shrink-0">
                      {g.gapType === 'KNOWLEDGE_PROPOSAL' && (
                        <Btn variant="teal" size="sm" onClick={() => setResolveModal(g)}>
                          <CheckCircle size={12} /> Resolve
                        </Btn>
                      )}
                      {g.gapType === 'SOURCE_REQUEST' && (
                        <Btn variant="teal" size="sm" onClick={() => setSourceModal(g)}>
                          <Database size={12} /> Connect
                        </Btn>
                      )}
                      <Btn variant="ghost" size="sm" onClick={() => dismiss(g.gapKey)}>
                        <XCircle size={12} />
                      </Btn>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve knowledge modal */}
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Knowledge Gap">
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{resolveModal?.question}</p>
          <Textarea label="Document or knowledge added to resolve this" rows={3} value={resolveDoc}
            onChange={e => setResolveDoc(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Btn>
            <Btn onClick={resolve} disabled={saving || !resolveDoc}>
              {saving ? <Spinner size={4} /> : <CheckCircle size={13} />} Resolve
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Resolve source modal */}
      <Modal open={!!sourceModal} onClose={() => setSourceModal(null)} title="Connect Data Source">
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{sourceModal?.question}</p>
          <Textarea label="Connection key that satisfies this request" rows={2} value={sourceConn}
            onChange={e => setSourceConn(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setSourceModal(null)}>Cancel</Btn>
            <Btn onClick={resolveSource} disabled={saving || !sourceConn}>
              {saving ? <Spinner size={4} /> : <Database size={13} />} Resolve
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
