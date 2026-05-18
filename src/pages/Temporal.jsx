import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Textarea, Spinner } from '../components/Card.jsx';
import {
  Activity, Plus, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Bell, BellOff, Trash2, Pencil, Play, Slack, Mail, Smartphone,
} from 'lucide-react';

// ── colour maps ───────────────────────────────────────────────────────────────
const SEV_COLOR  = { HIGH: 'red', MEDIUM: 'yellow', LOW: 'blue', CRITICAL: 'red' };
const SEV_ICON   = { HIGH: TrendingUp, MEDIUM: TrendingDown, LOW: Minus, CRITICAL: AlertTriangle };
const SEV_BG     = { CRITICAL: 'bg-red-50', HIGH: 'bg-red-50', MEDIUM: 'bg-amber-50', LOW: 'bg-blue-50' };
const SEV_TEXT   = { CRITICAL: 'text-red-600', HIGH: 'text-red-600', MEDIUM: 'text-amber-600', LOW: 'text-blue-600' };

const CHANNEL_ICON = { IN_APP: Smartphone, SLACK: Slack, EMAIL: Mail, ALL: Bell };
const CHANNEL_COLOR = { IN_APP: 'navy', SLACK: 'purple', EMAIL: 'blue', ALL: 'green' };

function emptyRuleForm() {
  return {
    ruleName: '', baselineKey: '', metricName: '',
    condition: 'ANY_ANOMALY', severityThreshold: 'MEDIUM',
    channel: 'IN_APP', slackWebhook: '', emailTo: '', cooldownMinutes: 60, enabled: true,
  };
}

// ── Alert Rules tab ───────────────────────────────────────────────────────────
function AlertRulesTab({ baselines }) {
  const [rules,       setRules]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form,        setForm]        = useState(emptyRuleForm());
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState(null);
  const [error,       setError]       = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = () => api.alerts.rules.list()
    .then(r => setRules(Array.isArray(r) ? r : []))
    .catch(() => setRules([]))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingRule(null);
    setForm(emptyRuleForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      ruleName:          rule.rule_name ?? '',
      baselineKey:       rule.baseline_key ?? '',
      metricName:        rule.metric_name ?? '',
      condition:         rule.condition ?? 'ANY_ANOMALY',
      severityThreshold: rule.severity_threshold ?? 'MEDIUM',
      channel:           rule.channel ?? 'IN_APP',
      slackWebhook:      rule.slack_webhook ?? '',
      emailTo:           rule.email_to ?? '',
      cooldownMinutes:   rule.cooldown_minutes ?? 60,
      enabled:           rule.enabled ?? true,
    });
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        ruleName:          form.ruleName,
        baselineKey:       form.baselineKey || null,
        metricName:        form.metricName  || null,
        condition:         form.condition,
        severityThreshold: form.severityThreshold,
        channel:           form.channel,
        slackWebhook:      form.slackWebhook || null,
        emailTo:           form.emailTo      || null,
        cooldownMinutes:   Number(form.cooldownMinutes),
        enabled:           form.enabled,
      };
      if (editingRule) {
        await api.alerts.rules.update(editingRule.rule_key, payload);
      } else {
        await api.alerts.rules.create(payload);
      }
      await load();
      setShowModal(false);
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteRule = async (key) => {
    if (!confirm('Delete this alert rule?')) return;
    await api.alerts.rules.delete(key).catch(() => {});
    setRules(r => r.filter(x => (x.rule_key ?? x.ruleKey) !== key));
  };

  const testRule = async (key) => {
    setTesting(key);
    try {
      await api.alerts.rules.test(key);
      alert('Test alert sent! Check your configured channels.');
    } catch (e) {
      alert('Test failed: ' + e.message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Btn onClick={openAdd}><Plus size={13} /> New Alert Rule</Btn>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : rules.length === 0 ? (
        <EmptyState icon={BellOff} title="No alert rules"
          body="Create alert rules to be notified via Slack, email, or in-app when metric baselines detect anomalies." />
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const key    = rule.rule_key ?? rule.ruleKey;
            const ch     = rule.channel ?? 'IN_APP';
            const ChIcon = CHANNEL_ICON[ch] ?? Bell;
            const enabled = rule.enabled ?? true;
            return (
              <Card key={key} className={`p-4 transition-opacity ${enabled ? '' : 'opacity-60'}`}>
                <div className="flex items-start gap-4">
                  {/* Channel icon */}
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0
                                  bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                    <Bell size={18} className="text-amber-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[14px] font-semibold text-[#111827]">
                        {rule.rule_name ?? rule.ruleName}
                      </span>
                      <Badge label={enabled ? 'ACTIVE' : 'DISABLED'} color={enabled ? 'green' : 'gray'} />
                      <Badge label={rule.severity_threshold ?? rule.severityThreshold ?? 'MEDIUM'}
                             color={SEV_COLOR[rule.severity_threshold ?? rule.severityThreshold] ?? 'gray'} />
                      <Badge label={ch} color={CHANNEL_COLOR[ch] ?? 'gray'} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
                      {(rule.baseline_key ?? rule.baselineKey) && (
                        <span>Baseline: <code className="text-[11.5px] bg-gray-100 px-1 rounded">
                          {rule.baseline_key ?? rule.baselineKey}
                        </code></span>
                      )}
                      {(rule.metric_name ?? rule.metricName) && (
                        <span>Metric: <strong className="text-[#374151]">
                          {rule.metric_name ?? rule.metricName}
                        </strong></span>
                      )}
                      <span>Condition: <strong className="text-[#374151]">
                        {rule.condition ?? 'ANY_ANOMALY'}
                      </strong></span>
                      <span>Cooldown: <strong className="text-[#374151]">
                        {rule.cooldown_minutes ?? rule.cooldownMinutes ?? 60} min
                      </strong></span>
                    </div>

                    {ch === 'SLACK' && (rule.slack_webhook ?? rule.slackWebhook) && (
                      <div className="mt-1 text-[11.5px] text-[#9CA3AF] flex items-center gap-1">
                        <Slack size={11} /> Slack webhook configured
                      </div>
                    )}
                    {(ch === 'EMAIL' || ch === 'ALL') && (rule.email_to ?? rule.emailTo) && (
                      <div className="mt-1 text-[11.5px] text-[#9CA3AF] flex items-center gap-1">
                        <Mail size={11} /> {rule.email_to ?? rule.emailTo}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => testRule(key)}
                      disabled={testing === key}
                      title="Send test alert"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[12px]
                                 font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100
                                 border border-emerald-200 transition-colors disabled:opacity-50">
                      {testing === key ? <Spinner size={3} /> : <Play size={11} />}
                      Test
                    </button>
                    <button onClick={() => openEdit(rule)}
                      className="p-1.5 rounded-[7px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteRule(key)}
                      className="p-1.5 rounded-[7px] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={showModal}
             onClose={() => { setShowModal(false); setEditingRule(null); }}
             title={editingRule ? `Edit Rule — ${editingRule.rule_name ?? editingRule.ruleName}` : 'New Alert Rule'}>
        <div className="space-y-4">
          <Input label="Rule Name" placeholder="Overdue orders spike"
            value={form.ruleName} onChange={e => set('ruleName', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
                Baseline
              </label>
              <select value={form.baselineKey} onChange={e => set('baselineKey', e.target.value)}
                className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                           text-[#111827] bg-white focus:outline-none focus:border-emerald-400">
                <option value="">— Select baseline —</option>
                {baselines.map(b => (
                  <option key={b.baseline_key ?? b.baselineKey} value={b.baseline_key ?? b.baselineKey}>
                    {b.metric_name ?? b.metricName ?? b.baseline_key ?? b.baselineKey}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Metric Name (optional override)"
              placeholder="Overdue Orders Count"
              value={form.metricName} onChange={e => set('metricName', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select label="Condition" value={form.condition} onChange={e => set('condition', e.target.value)}>
              <option value="ANY_ANOMALY">Any anomaly</option>
              <option value="ABOVE_WARNING">Above warning</option>
              <option value="ABOVE_CRITICAL">Critical only</option>
              <option value="BELOW_WARNING">Below warning</option>
              <option value="BELOW_CRITICAL">Below critical</option>
            </Select>
            <Select label="Min Severity" value={form.severityThreshold} onChange={e => set('severityThreshold', e.target.value)}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Cooldown (minutes)" type="number" min={5} max={10080}
              value={form.cooldownMinutes} onChange={e => set('cooldownMinutes', e.target.value)} />
          </div>

          <Select label="Notification Channel" value={form.channel} onChange={e => set('channel', e.target.value)}>
            <option value="IN_APP">In-app only</option>
            <option value="SLACK">Slack</option>
            <option value="EMAIL">Email</option>
            <option value="ALL">All channels (in-app + Slack + email)</option>
          </Select>

          {(form.channel === 'SLACK' || form.channel === 'ALL') && (
            <Input label="Slack Webhook URL"
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              value={form.slackWebhook} onChange={e => set('slackWebhook', e.target.value)} />
          )}

          {(form.channel === 'EMAIL' || form.channel === 'ALL') && (
            <Input label="Email Recipients (comma-separated)"
              placeholder="analyst@company.com, manager@company.com"
              value={form.emailTo} onChange={e => set('emailTo', e.target.value)} />
          )}

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only"
                checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                              ${form.enabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-[13px] font-medium text-[#374151]">
              Rule enabled
            </span>
          </label>

          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" onClick={() => { setShowModal(false); setEditingRule(null); }}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.ruleName}>
              {saving ? <Spinner size={4} /> : editingRule ? <Pencil size={13} /> : <Plus size={13} />}
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Temporal() {
  const [baselines,     setBaselines]     = useState([]);
  const [anomalies,     setAnomalies]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('anomalies');
  const [showAdd,       setShowAdd]       = useState(false);
  const [refreshingKey, setRefreshingKey] = useState(null);
  const [baselineForm,  setBaselineForm]  = useState({
    domain_key: '', metric_name: '', measurement_sql: '',
    connection_key: '', measurement_window: 'DAILY',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const setF = (k, v) => setBaselineForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      api.temporal.baselines('PLATFORM').catch(() => []),
      api.temporal.anomalies('PLATFORM').catch(() => []),
    ]).then(([b, a]) => { setBaselines(Array.isArray(b) ? b : []); setAnomalies(Array.isArray(a) ? a : []); })
      .finally(() => setLoading(false));
  }, []);

  const refreshBaseline = async (key) => {
    setRefreshingKey(key);
    try {
      await api.temporal.refreshBaseline(key);
      const b = await api.temporal.baselines('PLATFORM').catch(() => []);
      setBaselines(Array.isArray(b) ? b : []);
    } catch (_) {}
    finally { setRefreshingKey(null); }
  };

  const saveBaseline = async () => {
    setSaving(true); setError('');
    try {
      await api.temporal.createBaseline(baselineForm);
      setBaselines(await api.temporal.baselines('PLATFORM').catch(() => []));
      setShowAdd(false);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const patchAnomaly = async (key, status) => {
    await api.temporal.patchAnomaly(key, { status }).catch(() => {});
    setAnomalies(as => as.map(a => (a.anomaly_key ?? a.anomalyKey) === key
      ? { ...a, status } : a));
  };

  const TABS = [
    ['anomalies', `Anomalies (${anomalies.length})`],
    ['baselines', `Baselines (${baselines.length})`],
    ['alerts',    'Alert Rules'],
  ];

  return (
    <div className="flex-1 overflow-auto p-7 bg-transparent">
      <PageHeader
        title="Temporal Intelligence"
        subtitle="Baselines, anomaly detection, and proactive alert rules"
        actions={
          tab === 'baselines'
            ? <Btn size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add Baseline</Btn>
            : null
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-gray-100/80 p-1 rounded-[10px] w-fit">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all
              ${tab === k
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#374151]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Alert Rules tab ── */}
      {tab === 'alerts' && <AlertRulesTab baselines={baselines} />}

      {/* ── Anomalies tab ── */}
      {tab === 'anomalies' && (loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : anomalies.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No anomalies"
          body="Anomalies appear when metric baselines detect statistically significant deviations." />
      ) : (
        <div className="space-y-2">
          {anomalies.map(a => {
            const key    = a.anomaly_key ?? a.anomalyKey;
            const sev    = a.severity ?? 'LOW';
            const SevIcon = SEV_ICON[sev] ?? Activity;
            return (
              <Card key={key} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${SEV_BG[sev] ?? 'bg-gray-50'}`}>
                    <SevIcon size={17} className={SEV_TEXT[sev] ?? 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[14px] font-semibold text-[#111827]">
                        {a.metric_name ?? a.metricName ?? 'Metric anomaly'}
                      </span>
                      <Badge label={sev} color={SEV_COLOR[sev] ?? 'gray'} />
                      <Badge label={a.status ?? 'OPEN'}
                             color={a.status === 'RESOLVED' ? 'green' : a.status === 'INVESTIGATING' ? 'blue' : 'yellow'} />
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
                      {a.observed_value  != null && <span>Observed: <strong className="text-[#374151]">{Number(a.observed_value).toLocaleString()}</strong></span>}
                      {a.baseline_value  != null && <span>Baseline: <strong className="text-[#374151]">{Number(a.baseline_value).toFixed(2)}</strong></span>}
                      {a.deviation_pct   != null && <span>Δ {a.deviation_pct > 0 ? '+' : ''}{Number(a.deviation_pct).toFixed(1)}%</span>}
                      <span>{a.detected_at?.split?.('T')?.[0] ?? ''}</span>
                    </div>
                  </div>
                  {(a.status ?? 'OPEN') === 'OPEN' && (
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="secondary" size="sm" onClick={() => patchAnomaly(key, 'INVESTIGATING')}>Investigate</Btn>
                      <Btn variant="ghost" size="sm" onClick={() => patchAnomaly(key, 'RESOLVED')}>Resolve</Btn>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {/* ── Baselines tab ── */}
      {tab === 'baselines' && (loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : baselines.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No baselines"
          body="Create metric baselines to enable automatic anomaly detection and proactive alerts." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {baselines.map(b => {
            const key  = b.baseline_key ?? b.baselineKey;
            const name = b.metric_name ?? b.metricName ?? key;
            return (
              <Card key={key} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827] mb-1">{name}</p>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      <Badge label={b.measurement_window ?? b.measurementWindow ?? 'DAILY'} color="navy" />
                      <Badge label={b.status ?? 'ACTIVE'} color={b.status === 'ACTIVE' ? 'green' : 'gray'} />
                    </div>
                    {b.current_value != null && (
                      <p className="text-[12px] text-[#6B7280]">
                        Current: <strong className="text-[#111827]">{Number(b.current_value).toLocaleString()}</strong>
                        {b.baseline_avg != null && (
                          <> · Avg: <strong className="text-[#374151]">{Number(b.baseline_avg).toFixed(1)}</strong></>
                        )}
                      </p>
                    )}
                    {b.last_computed_at && (
                      <p className="text-[11.5px] text-[#9CA3AF] mt-1">
                        Last run: {new Date(b.last_computed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Btn variant="ghost" size="sm" disabled={refreshingKey === key}
                    onClick={() => refreshBaseline(key)}
                    title="Run baseline now">
                    {refreshingKey === key ? <Spinner size={3} /> : <RefreshCw size={13} />}
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {/* Add Baseline Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setError(''); }} title="Add Metric Baseline">
        <div className="space-y-3">
          <Input label="Domain Key" placeholder="PLATFORM"
            value={baselineForm.domain_key} onChange={e => setF('domain_key', e.target.value)} />
          <Input label="Metric Name" placeholder="Overdue Purchase Orders"
            value={baselineForm.metric_name} onChange={e => setF('metric_name', e.target.value)} />
          <Textarea label="Measurement SQL (must return a single numeric value)"
            rows={3}
            placeholder="SELECT COUNT(*) FROM lgs_purchase_order WHERE status = 'OVERDUE'"
            value={baselineForm.measurement_sql} onChange={e => setF('measurement_sql', e.target.value)} />
          <Input label="Connection Key" placeholder="conn-abc123"
            value={baselineForm.connection_key} onChange={e => setF('connection_key', e.target.value)} />
          <Select label="Measurement Window" value={baselineForm.measurement_window}
            onChange={e => setF('measurement_window', e.target.value)}>
            {['DAILY', 'WEEKLY', 'MONTHLY'].map(w => <option key={w}>{w}</option>)}
          </Select>
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-600">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={saveBaseline}
              disabled={saving || !baselineForm.metric_name || !baselineForm.measurement_sql || !baselineForm.connection_key}>
              {saving ? <Spinner size={4} /> : <Plus size={13} />} Create Baseline
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
