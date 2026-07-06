import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { RefreshCw, Clock, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function greeting(name) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const firstName  = (name || '').split(/[ @._]+/)[0];
  return firstName ? `${salutation}, ${firstName}.` : `${salutation}.`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function TrendChip({ direction, trend }) {
  if (!trend) return null;
  const styles = {
    up:   'text-emerald-700 bg-emerald-50',
    down: 'text-red-600    bg-red-50',
    flat: 'text-gray-500   bg-gray-100',
  };
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${styles[direction] || styles.flat}`}>
      {trend}
    </span>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────

function UrgentSection({ section }) {
  const items = section.items || [];
  return (
    <div className="border-l-[3px] border-red-400 pl-5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-500 mb-3">
        {section.title}
      </h3>
      {section.content && (
        <p className="text-[14px] text-gray-800 leading-[1.7] mb-3">{section.content}</p>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                item.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-400'
              }`} />
              <span className="text-[14px] text-gray-800 leading-[1.7]">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SnapshotSection({ section }) {
  const metrics = section.metrics || [];
  return (
    <div className="border-l-[3px] border-gray-200 pl-5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3">
        {section.title}
      </h3>
      {section.content && (
        <p className="text-[14px] text-gray-600 leading-[1.7] mb-4">{section.content}</p>
      )}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400 mb-0.5">{m.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-bold text-gray-900 tracking-tight">{m.value}</span>
                <TrendChip direction={m.direction} trend={m.trend} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProseSection({ section, color = 'gray' }) {
  const colors = {
    emerald: 'border-emerald-400 text-emerald-600',
    gray:    'border-gray-200    text-gray-400',
  };
  return (
    <div className={`border-l-[3px] pl-5 ${colors[color]?.split(' ')[0] || 'border-gray-200'}`}>
      <h3 className={`text-[10px] font-bold uppercase tracking-[0.12em] mb-3 ${colors[color]?.split(' ')[1] || 'text-gray-400'}`}>
        {section.title}
      </h3>
      <p className="text-[14px] text-gray-800 leading-[1.7]">{section.content}</p>
    </div>
  );
}

function BriefSection({ section }) {
  switch (section.type) {
    case 'urgent':   return <UrgentSection   section={section} />;
    case 'snapshot': return <SnapshotSection section={section} />;
    case 'working':  return <ProseSection    section={section} color="emerald" />;
    default:         return <ProseSection    section={section} />;
  }
}

// ── Skeleton loading state ────────────────────────────────────────────────────

function BriefSkeleton({ agentsActive }) {
  return (
    <div className="animate-pulse space-y-8 max-w-3xl mx-auto px-8 py-10">
      <div>
        <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-64" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="border-l-[3px] border-gray-100 pl-5 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>
      ))}
      <p className="text-[13px] text-gray-400 text-center">
        {agentsActive > 0
          ? `Your agents are analysing the data… this takes about 30 seconds.`
          : 'Preparing your brief…'}
      </p>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
];

// Agent picker — shown in both setup and config panel
function AgentPicker({ allAgents, selected, onChange }) {
  if (allAgents.length === 0) return (
    <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      No active agents found. Create and activate agents on the Agents page first.
    </p>
  );
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {allAgents.map(a => {
        const checked = selected.includes(a.id);
        return (
          <label key={a.id}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              checked ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
            <input type="checkbox" checked={checked} onChange={() => {
              onChange(checked ? selected.filter(id => id !== a.id) : [...selected, a.id]);
            }} className="mt-0.5 accent-emerald-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">{a.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{a.goal}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ── Setup state ───────────────────────────────────────────────────────────────

function BriefSetup({ onSave }) {
  const [form,     setForm]     = useState({ schedule_time: '07:00', timezone: 'UTC', email_to: '' });
  const [agents,   setAgents]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.brief.agents()
      .then(data => {
        const active = (Array.isArray(data) ? data : []).filter(a => a.status === 'ACTIVE');
        setAgents(active);
        setSelected(active.map(a => a.id)); // default: all active agents selected
      })
      .catch(() => {});
  }, []);

  const save = async (generateNow) => {
    setSaving(true);
    try {
      await api.brief.saveConfig({ ...form, enabled: true, brief_agent_ids: selected });
      if (generateNow) await api.brief.generate();
      onSave();
    } catch (_) {}
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <h2 className="text-[22px] font-bold text-gray-900 mb-2">Set up Morning Brief</h2>
          <p className="text-[14px] text-gray-500 leading-[1.6]">
            Every morning, Zevra Agents analyse your operational data and prepare
            a concise executive summary — ready before you start your day.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Deliver at
              </label>
              <input type="time"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                value={form.schedule_time}
                onChange={e => setForm(f => ({ ...f, schedule_time: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Timezone
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Contributing Agents
            </label>
            <AgentPicker allAgents={agents} selected={selected} onChange={setSelected} />
            {agents.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                {selected.length === 0
                  ? 'Select at least one agent to enable the brief.'
                  : `${selected.length} of ${agents.length} agents will contribute to your brief.`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Email recipients (optional)
            </label>
            <input type="text" placeholder="ceo@company.com, coo@company.com"
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              value={form.email_to}
              onChange={e => setForm(f => ({ ...f, email_to: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => save(true)} disabled={saving}
              className="flex-1 bg-[#07201A] hover:bg-[#0d2e24] text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Setting up…' : 'Set up & Generate Now'}
            </button>
            <button onClick={() => save(false)} disabled={saving}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Save only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Brief() {
  const { user } = useAuth();
  const [brief,        setBrief]        = useState(undefined);  // undefined = loading
  const [config,       setConfig]       = useState(undefined);
  const [regenerating, setRegenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [allAgents,    setAllAgents]    = useState([]);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [savingCfg,    setSavingCfg]    = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({});

  const load = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([
        api.brief.today().catch(() => null),
        api.brief.getConfig().catch(() => null),
      ]);
      setBrief(b);
      setConfig(c);
    } catch (_) {
      setBrief(null);
      setConfig(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load available agents when settings panel opens
  useEffect(() => {
    if (!showSettings) return;
    api.brief.agents()
      .then(data => {
        const active = (Array.isArray(data) ? data : []).filter(a => a.status === 'ACTIVE');
        setAllAgents(active);
        const currentIds = config?.brief_agent_ids ?? [];
        setSelectedIds(currentIds.length > 0 ? currentIds : active.map(a => a.id));
      })
      .catch(() => {});
  }, [showSettings, config]);

  // Poll while brief is GENERATING
  useEffect(() => {
    if (brief?.status !== 'GENERATING') return;
    const interval = setInterval(async () => {
      const updated = await api.brief.today().catch(() => null);
      if (updated?.status !== 'GENERATING') {
        setBrief(updated);
        clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [brief?.status]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api.brief.generate();
      const updated = await api.brief.today().catch(() => null);
      setBrief(updated);
    } catch (_) {}
    finally { setRegenerating(false); }
  };

  // ── Render states ─────────────────────────────────────────────────────────

  // Still loading initial data
  if (brief === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // No config yet — show setup
  if (!config) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <BriefSetup onSave={load} />
      </div>
    );
  }

  // Brief generating
  if (!brief || brief.status === 'GENERATING') {
    return (
      <div className="h-full overflow-y-auto bg-white">
        {/* Header */}
        <BriefHeader user={user} brief={null} regenerating={false} onRegenerate={null} />
        <BriefSkeleton agentsActive={0} />
      </div>
    );
  }

  // Brief failed
  if (brief.status === 'FAILED') {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <BriefHeader user={user} brief={brief} regenerating={regenerating} onRegenerate={regenerate} />
        <div className="max-w-3xl mx-auto px-8 py-16 text-center">
          <AlertTriangle size={32} className="text-amber-400 mx-auto mb-4" />
          <p className="text-[15px] text-gray-600 mb-6">
            This morning's brief encountered an error. Click Regenerate to try again.
          </p>
          <button onClick={regenerate} disabled={regenerating}
            className="inline-flex items-center gap-2 bg-[#07201A] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50">
            <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
            Regenerate
          </button>
        </div>
      </div>
    );
  }

  // Brief ready — parse sections
  let sections = [];
  try {
    const raw = brief.sections_json ?? brief.sectionsJson ?? '[]';
    sections = JSON.parse(raw);
  } catch (_) {}

  const agentsLabel = (brief.agents_used ?? brief.agentsUsed ?? []).join(' · ');
  const genTime = (brief.generated_at ?? brief.generatedAt)
    ? new Date(brief.generated_at ?? brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <BriefHeader user={user} brief={brief} regenerating={regenerating} onRegenerate={regenerate} />

      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Headline */}
        <p className="text-[22px] font-bold text-gray-900 leading-[1.4] mb-10">
          {brief.headline}
        </p>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section, i) => (
            <BriefSection key={i} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-14 pt-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
            {agentsLabel && <span>Generated by {agentsLabel}</span>}
            {genTime && (
              <>
                <span>·</span>
                <Clock size={11} />
                <span>{genTime}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSettings(s => !s)}
              className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
              Configure brief
            </button>
            <button onClick={regenerate} disabled={regenerating}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40">
              <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>
        </div>

        {/* Configure brief modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              {/* Modal header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h3 className="text-[16px] font-bold text-gray-900">Configure Morning Brief</h3>
                <p className="text-[12.5px] text-gray-500 mt-0.5">
                  Choose which agents contribute to your brief. Each covers its own domain.
                </p>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-5">

                {/* Agent picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Contributing Agents
                  </label>
                  <AgentPicker allAgents={allAgents} selected={selectedIds} onChange={setSelectedIds} />
                  {allAgents.length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {selectedIds.length === 0
                        ? 'Select at least one agent.'
                        : `${selectedIds.length} of ${allAgents.length} agents will contribute.`}
                    </p>
                  )}
                </div>

                {/* Schedule row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Deliver at
                    </label>
                    <input type="time"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      defaultValue={config?.schedule_time ?? '07:00'}
                      id="cfg-time"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Timezone
                    </label>
                    <select id="cfg-tz"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      defaultValue={config?.timezone ?? 'UTC'}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email recipients (optional)
                  </label>
                  <input type="text" id="cfg-email"
                    placeholder="ceo@company.com, coo@company.com"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    defaultValue={config?.email_to ?? ''}
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  disabled={savingCfg || selectedIds.length === 0}
                  onClick={async () => {
                    setSavingCfg(true);
                    try {
                      await api.brief.saveConfig({
                        schedule_time:   document.getElementById('cfg-time').value,
                        timezone:        document.getElementById('cfg-tz').value,
                        email_to:        document.getElementById('cfg-email').value,
                        enabled:         true,
                        brief_agent_ids: selectedIds,
                      });
                      await load();
                      setShowSettings(false);
                    } catch (_) {}
                    finally { setSavingCfg(false); }
                  }}
                  className="flex-1 bg-[#07201A] hover:bg-[#0d2e24] text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50">
                  {savingCfg ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setShowSettings(false)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Header block ──────────────────────────────────────────────────────────────

function BriefHeader({ user, brief, regenerating, onRegenerate }) {
  const name = user?.display_name || user?.email;
  return (
    <div className="bg-[#07201A] px-8 py-7">
      <div className="max-w-3xl mx-auto flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white leading-tight">
            {greeting(name)}
          </h1>
          <p className="text-[13px] text-white/50 mt-1">{formatDate()}</p>
          <p className="text-[12px] text-white/35 mt-0.5">Prepared by your Zevra agents</p>
        </div>
        {brief?.status === 'READY' && onRegenerate && (
          <button onClick={onRegenerate} disabled={regenerating}
            className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors mt-1 disabled:opacity-30">
            <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
