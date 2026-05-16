import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Spinner } from '../components/Card.jsx';
import { Activity, Plus, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const STATUS_COLOR = { ACTIVE: 'green', STALE: 'yellow', ERROR: 'red' };
const SEV_COLOR = { HIGH: 'red', MEDIUM: 'yellow', LOW: 'blue', INFO: 'gray' };
const SEV_ICON = { HIGH: TrendingUp, MEDIUM: TrendingDown, LOW: Minus, INFO: Activity };
const ANOMALY_STATUS_COLOR = { OPEN: 'yellow', REVIEWED: 'blue', RESOLVED: 'green', FALSE_POSITIVE: 'gray' };

export default function Temporal() {
  const [baselines, setBaselines] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('anomalies');
  const [showAddBaseline, setShowAddBaseline] = useState(false);
  const [refreshingKey, setRefreshingKey] = useState(null);
  const [form, setForm] = useState({
    baselineKey: '', name: '', objectKey: '', metricColumn: '',
    aggregation: 'AVG', granularity: 'DAILY', connectionKey: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      api.temporal.baselines().catch(() => []),
      api.temporal.anomalies().catch(() => []),
    ]).then(([b, a]) => { setBaselines(b ?? []); setAnomalies(a ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const refreshBaseline = async (key) => {
    setRefreshingKey(key);
    try {
      await api.temporal.refreshBaseline(key);
      const b = await api.temporal.baselines().catch(() => []);
      setBaselines(b ?? []);
    } catch (_) {}
    finally { setRefreshingKey(null); }
  };

  const saveBaseline = async () => {
    setSaving(true); setError('');
    try {
      await api.temporal.createBaseline(form);
      setBaselines(await api.temporal.baselines().catch(() => []));
      setShowAddBaseline(false);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const patchAnomaly = async (key, status) => {
    await api.temporal.patchAnomaly(key, { reviewStatus: status }).catch(() => {});
    setAnomalies(as => as.map(a => a.anomalyKey === key ? { ...a, reviewStatus: status } : a));
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <PageHeader
        title="Temporal Intelligence"
        subtitle="Baselines, anomaly detection, and trend monitoring"
        actions={
          tab === 'baselines'
            ? <Btn size="sm" onClick={() => setShowAddBaseline(true)}><Plus size={13} /> Add Baseline</Btn>
            : null
        }
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['anomalies', 'Anomalies'], ['baselines', 'Baselines']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : tab === 'anomalies' ? (
        anomalies.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No anomalies" body="Anomalies appear when metric baselines detect statistically significant deviations." />
        ) : (
          <div className="space-y-2">
            {anomalies.map(a => {
              const SevIcon = SEV_ICON[a.severity] ?? Activity;
              return (
                <Card key={a.anomalyKey} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                      ${a.severity === 'HIGH' ? 'bg-red-50' : a.severity === 'MEDIUM' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                      <SevIcon size={16} className={
                        a.severity === 'HIGH' ? 'text-red-600' : a.severity === 'MEDIUM' ? 'text-yellow-600' : 'text-blue-600'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{a.metricName}</span>
                        <Badge label={a.severity ?? 'INFO'} color={SEV_COLOR[a.severity] ?? 'gray'} />
                        <Badge label={a.reviewStatus ?? 'OPEN'} color={ANOMALY_STATUS_COLOR[a.reviewStatus] ?? 'gray'} />
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{a.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        {a.observedValue != null && <span>Observed: <strong className="text-gray-600">{a.observedValue}</strong></span>}
                        {a.expectedValue != null && <span>Expected: <strong className="text-gray-600">{a.expectedValue}</strong></span>}
                        {a.deviationPct != null && <span>Δ {a.deviationPct > 0 ? '+' : ''}{a.deviationPct?.toFixed(1)}%</span>}
                        <span>{a.detectedAt?.split('T')[0]}</span>
                      </div>
                    </div>
                    {a.reviewStatus === 'OPEN' && (
                      <div className="flex gap-1 shrink-0">
                        <Btn variant="secondary" size="sm" onClick={() => patchAnomaly(a.anomalyKey, 'REVIEWED')}>Review</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => patchAnomaly(a.anomalyKey, 'FALSE_POSITIVE')}>FP</Btn>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        baselines.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No baselines" body="Create metric baselines to enable automatic anomaly detection." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {baselines.map(b => (
              <Card key={b.baselineKey} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-indigo-700">{b.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.objectKey} · {b.metricColumn}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge label={b.granularity ?? 'DAILY'} color="navy" />
                      <Badge label={b.status ?? 'ACTIVE'} color={STATUS_COLOR[b.status] ?? 'gray'} />
                    </div>
                    {b.lastRefreshedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Refreshed: {new Date(b.lastRefreshedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Btn variant="ghost" size="sm" disabled={refreshingKey === b.baselineKey}
                    onClick={() => refreshBaseline(b.baselineKey)}>
                    {refreshingKey === b.baselineKey ? <Spinner size={3} /> : <RefreshCw size={13} />}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal open={showAddBaseline} onClose={() => setShowAddBaseline(false)} title="Add Baseline">
        <div className="space-y-3">
          <Input label="Baseline Key" placeholder="daily-invoice-volume" value={form.baselineKey}
            onChange={e => set('baselineKey', e.target.value)} />
          <Input label="Display Name" placeholder="Daily Invoice Volume" value={form.name}
            onChange={e => set('name', e.target.value)} />
          <Input label="Object Key" placeholder="invoicing-ods-invc_head" value={form.objectKey}
            onChange={e => set('objectKey', e.target.value)} />
          <Input label="Metric Column" placeholder="invc_id" value={form.metricColumn}
            onChange={e => set('metricColumn', e.target.value)} />
          <Input label="Connection Key" placeholder="ods-oracle" value={form.connectionKey}
            onChange={e => set('connectionKey', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Aggregation" value={form.aggregation} onChange={e => set('aggregation', e.target.value)}>
              {['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].map(a => <option key={a}>{a}</option>)}
            </Select>
            <Select label="Granularity" value={form.granularity} onChange={e => set('granularity', e.target.value)}>
              {['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'].map(g => <option key={g}>{g}</option>)}
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowAddBaseline(false)}>Cancel</Btn>
            <Btn onClick={saveBaseline} disabled={saving || !form.baselineKey || !form.name}>
              {saving ? <Spinner size={4} /> : <Plus size={13} />} Create
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
