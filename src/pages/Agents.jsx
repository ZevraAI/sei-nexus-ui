import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Textarea, Spinner } from '../components/Card.jsx';
import { Bot, Plus, ChevronDown, ChevronRight, BarChart2, Trash2, Pencil } from 'lucide-react';

const STATUS_COLOR = { ACTIVE: 'green', INACTIVE: 'gray', DRAFT: 'yellow' };

function agentKeyOf(agent) { return agent.agentKey ?? agent.agent_key; }
function agentTypeOf(agent) { return agent.agentType ?? agent.agent_type; }
function domainKeysOf(agent) { return agent.domainKeys ?? agent.domain_keys ?? ''; }
function connectionKeysOf(agent) { return agent.connectionKeys ?? agent.connection_keys ?? ''; }
function restApiEnabledOf(agent) { return agent.restApiEnabled ?? agent.rest_api_enabled ?? false; }
function actionScopeOf(agent) { return agent.actionScope ?? agent.action_scope ?? 'READ_ONLY'; }

function emptyAgentForm() {
  return {
    agentKey: '', name: '', agentType: 'OPERATIONAL_INVESTIGATOR',
    purpose: '', domainKeys: '', connectionKeys: '',
    systemPromptOverride: '', status: 'ACTIVE',
  };
}

function AgentCard({ agent, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('playbooks');
  const [playbooks, setPlaybooks] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const key = agentKeyOf(agent);
        const [pb, kp] = await Promise.all([
          api.agents.playbooks(key).catch(() => []),
          api.agents.kpis(key).catch(() => []),
        ]);
        setPlaybooks(pb ?? []);
        setKpis(kp ?? []);
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
            <span className="text-sm font-semibold text-indigo-700">{agent.name}</span>
            <Badge label={agent.status ?? 'ACTIVE'} color={STATUS_COLOR[agent.status] ?? 'gray'} />
            {agentTypeOf(agent) && <Badge label={agentTypeOf(agent)} color="navy" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{agent.purpose}</p>
          {domainKeysOf(agent) && (
            <p className="text-xs text-gray-400 mt-0.5">Domains: {domainKeysOf(agent)}</p>
          )}
          {connectionKeysOf(agent) && (
            <p className="text-xs text-gray-400 mt-0.5">Connections: {connectionKeysOf(agent)}</p>
          )}

          {expanded && (
            <div className="mt-3">
              <div className="flex gap-1 mb-2 border-b border-gray-100">
                {[['playbooks', 'Playbooks'], ['kpis', 'KPIs']].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors
                      ${tab === k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>

              {tab === 'playbooks' && (
                <div className="space-y-2">
                  {(playbooks ?? []).length === 0
                    ? <p className="text-xs text-gray-400">No playbooks</p>
                    : playbooks.map(pb => (
                      <div key={pb.playbookKey} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-700">{pb.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{pb.investigationSteps}</p>
                      </div>
                    ))}
                </div>
              )}

              {tab === 'kpis' && (
                <div className="space-y-2">
                  {(kpis ?? []).length === 0
                    ? <p className="text-xs text-gray-400">No KPIs</p>
                    : kpis.map(kpi => (
                      <div key={kpi.kpiKey} className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
                        <BarChart2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{kpi.name}</p>
                          <p className="text-xs text-gray-500">{kpi.description}</p>
                          {kpi.targetValue && (
                            <p className="text-xs text-gray-400 mt-0.5">Target: {kpi.targetValue} {kpi.unit}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Btn variant="ghost" size="sm" onClick={() => onEdit(agent)} title="Edit agent">
            <Pencil size={13} />
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => onDelete(agentKeyOf(agent))} title="Archive agent">
            <Trash2 size={13} />
          </Btn>
        </div>
      </div>
    </Card>
  );
}

const AGENT_TYPES = ['OPERATIONAL_INVESTIGATOR', 'ANALYTICAL', 'COMPLIANCE', 'EXECUTIVE', 'DOMAIN_EXPERT'];

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm] = useState(emptyAgentForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadAgents = async () => {
    const rows = await api.agents.list().catch(() => []);
    setAgents((rows ?? []).filter(a => a.status !== 'ARCHIVED'));
  };

  useEffect(() => {
    loadAgents().finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditingAgent(null);
    setForm(emptyAgentForm());
    setError('');
    setShowAdd(true);
  };

  const openEdit = (agent) => {
    setEditingAgent(agent);
    setForm({
      agentKey: agentKeyOf(agent),
      name: agent.name || '',
      agentType: agentTypeOf(agent) || 'OPERATIONAL_INVESTIGATOR',
      purpose: agent.purpose || '',
      domainKeys: domainKeysOf(agent),
      connectionKeys: connectionKeysOf(agent),
      systemPromptOverride: '',
      status: agent.status || 'ACTIVE',
      restApiEnabled: restApiEnabledOf(agent),
      actionScope: actionScopeOf(agent),
    });
    setError('');
    setShowAdd(true);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.agents.create(form);
      await loadAgents();
      setShowAdd(false);
      setEditingAgent(null);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const deleteAgent = async (key) => {
    if (!key) {
      setError('Agent key is missing. Refresh and try again.');
      return;
    }
    if (!confirm('Archive this agent?')) return;
    try {
      await api.agents.delete(key);
      await loadAgents();
    } catch (e) {
      setError(e.message || 'Unable to archive agent');
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <PageHeader
        title="Agents"
        subtitle="Configure operational reasoning agents and their domain scope"
        actions={<Btn size="sm" onClick={openAdd}><Plus size={13} /> Add Agent</Btn>}
      />

      {error && !showAdd && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : agents.length === 0 ? (
        <EmptyState icon={Bot} title="No agents" body="Create an agent to start operational reasoning." />
      ) : (
        <div className="space-y-2">
          {agents.map(a => (
            <AgentCard
              key={agentKeyOf(a)}
              agent={a}
              onEdit={openEdit}
              onDelete={deleteAgent}
            />
          ))}
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingAgent(null); setError(''); }}
        title={editingAgent ? `Edit Agent - ${editingAgent.name}` : 'Add Agent'}
        width="max-w-xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Agent Key" placeholder="invoicing-agent" value={form.agentKey}
              disabled={!!editingAgent}
              onChange={e => set('agentKey', e.target.value)} />
            <Input label="Display Name" placeholder="Invoicing Investigator" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <Select label="Agent Type" value={form.agentType} onChange={e => set('agentType', e.target.value)}>
            {AGENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Textarea label="Purpose" rows={2} placeholder="Investigates invoice discrepancies and payment status…"
            value={form.purpose} onChange={e => set('purpose', e.target.value)} />
          <Input label="Domain Keys (comma-separated)" placeholder="invoicing,procurement"
            value={form.domainKeys} onChange={e => set('domainKeys', e.target.value)} />
          <Input label="Connection Keys (comma-separated)" placeholder="ods-oracle,dw-snowflake"
            value={form.connectionKeys} onChange={e => set('connectionKeys', e.target.value)} />
          <Textarea label="System Prompt Override (optional)" rows={3}
            placeholder="You are a specialist in AP/AR reconciliation…"
            value={form.systemPromptOverride} onChange={e => set('systemPromptOverride', e.target.value)} />
          <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
            {['ACTIVE', 'INACTIVE', 'DRAFT'].map(s => <option key={s}>{s}</option>)}
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditingAgent(null); }}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.agentKey || !form.name}>
              {saving ? <Spinner size={4} /> : editingAgent ? <Pencil size={13} /> : <Plus size={13} />}
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
