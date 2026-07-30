import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { cn } from '../utils/cn';
import {
  PageContainer, PulseSpine, Display, Text, Label, Card, MetricCard, StatusDot, Grid,
  Dialog, Field, Input, Select, Button, EmptyState, Skeleton, Spinner, InlineAlert,
} from '../ds';
import { RefreshCw, Clock, Check } from 'lucide-react';

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

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
];

// ── Hero (executive rhythm — mirrors the Homepage) ──────────────────────────────

function BriefHero({ user, verdict, refreshing, onRefresh, canRefresh }) {
  const name = user?.display_name || user?.email;
  return (
    <header className="pt-10">
      <PulseSpine className="mb-8" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-z-serif italic text-z-body-lg text-z-text-2">{greeting(name)}</p>
          <p className="mt-1 text-z-caption text-z-text-3">{formatDate()}</p>
        </div>
        {canRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} loading={refreshing}
            leadingIcon={<RefreshCw size={13} />}>
            Refresh
          </Button>
        )}
      </div>

      {verdict && <Display size="xl" className="mt-6 max-w-[24ch]">{verdict}</Display>}

      <Label as="p" className="mt-6">Prepared by your Zevra agents</Label>
    </header>
  );
}

// ── Brief section parser + renderer (Brief-specific, DS primitives only) ────────

const SECTION_ACCENT = { urgent: 'critical', working: 'primary' }; // default → neutral

function BriefSection({ section }) {
  const accent  = SECTION_ACCENT[section.type] ?? 'neutral';
  const items   = section.items   || [];
  const metrics = section.metrics || [];

  return (
    <Card accent={accent}>
      <Label>{section.title}</Label>

      {section.content && (
        <Text as="p" size="lg" tone="secondary" className="mt-3 font-z-serif leading-[1.62]">
          {section.content}
        </Text>
      )}

      {items.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <StatusDot status={item.severity === 'HIGH' ? 'critical' : 'warning'} className="mt-1.5" />
              <Text as="span" tone="secondary" className="leading-[1.6]">{item.text}</Text>
            </li>
          ))}
        </ul>
      )}

      {metrics.length > 0 && (
        <Grid cols={3} className="mt-4">
          {metrics.map((m, i) => (
            <MetricCard
              key={i}
              value={m.value}
              label={m.label}
              delta={m.trend || undefined}
              deltaTrend={m.direction || 'flat'}
            />
          ))}
        </Grid>
      )}
    </Card>
  );
}

// ── Agent picker (Brief-specific business component, DS primitives + tokens) ─────

function AgentPicker({ allAgents, selected, onChange }) {
  if (allAgents.length === 0) {
    return (
      <InlineAlert variant="warning">
        No active agents found. Create and activate agents on the Agents page first.
      </InlineAlert>
    );
  }
  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1" role="group" aria-label="Contributing agents">
      {allAgents.map(a => {
        const checked = selected.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(checked ? selected.filter(id => id !== a.id) : [...selected, a.id])}
            className={cn(
              'flex w-full items-start gap-3 rounded-z-md border px-3 py-2.5 text-left transition-colors duration-z-fast ease-z-standard',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring',
              checked ? 'border-z-primary bg-z-primary-soft' : 'border-z-border hover:bg-z-card-2',
            )}
          >
            <span className={cn(
              'mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-z-xs border',
              checked ? 'border-z-primary bg-z-primary text-z-on-accent' : 'border-z-border-strong',
            )}>
              {checked && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-z-body font-medium text-z-text">{a.name}</span>
              <span className="block truncate text-z-caption text-z-text-3">{a.goal}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Shared configuration form (used by both setup and Configure) ────────────────

function BriefConfigFields({ form, setForm, agents, selected, setSelected }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Deliver at">
          <Input type="time" value={form.schedule_time} onChange={e => set('schedule_time', e.target.value)} />
        </Field>
        <Field label="Timezone">
          <Select value={form.timezone} onChange={e => set('timezone', e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </Select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-z-caption font-medium text-z-text-2">Contributing Agents</span>
        <AgentPicker allAgents={agents} selected={selected} onChange={setSelected} />
        {agents.length > 0 && (
          <Text size="sm" tone="tertiary">
            {selected.length === 0
              ? 'Select at least one agent to enable the brief.'
              : `${selected.length} of ${agents.length} agents will contribute to your brief.`}
          </Text>
        )}
      </div>

      <Field label="Email recipients (optional)">
        <Input value={form.email_to} onChange={e => set('email_to', e.target.value)}
          placeholder="ceo@company.com, coo@company.com" />
      </Field>
    </div>
  );
}

/** One config implementation, two entry points (setup / configure). No duplicated JSX. */
function BriefConfigForm({ initial, mode, onSaved, onCancel }) {
  const [form, setForm] = useState({
    schedule_time: initial?.schedule_time ?? initial?.scheduleTime ?? '07:00',
    timezone:      initial?.timezone ?? 'UTC',
    email_to:      initial?.email_to ?? '',
  });
  const [agents,   setAgents]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving,   setSaving]   = useState(false);   // "Save" / "Save only"
  const [genSaving, setGenSaving] = useState(false); // "Set up & Generate Now"

  useEffect(() => {
    api.brief.agents()
      .then(data => {
        const active = (Array.isArray(data) ? data : []).filter(a => a.status === 'ACTIVE');
        setAgents(active);
        const currentIds = initial?.brief_agent_ids ?? [];
        setSelected(currentIds.length > 0 ? currentIds : active.map(a => a.id));
      })
      .catch(() => {});
  }, [initial]);

  const save = async (generateNow) => {
    if (generateNow) setGenSaving(true); else setSaving(true);
    try {
      await api.brief.saveConfig({ ...form, enabled: true, brief_agent_ids: selected });
      if (generateNow) await api.brief.generate();
      onSaved();
    } catch (_) {}
    finally { if (generateNow) setGenSaving(false); else setSaving(false); }
  };

  const busy = saving || genSaving;

  return (
    <div className="space-y-5">
      <BriefConfigFields form={form} setForm={setForm} agents={agents} selected={selected} setSelected={setSelected} />

      <div className="flex justify-end gap-3">
        {mode === 'configure' ? (
          <>
            <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button onClick={() => save(false)} loading={saving} disabled={selected.length === 0}>
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => save(false)} loading={saving} disabled={busy}>
              Save only
            </Button>
            <Button onClick={() => save(true)} loading={genSaving} disabled={busy}>
              Set up &amp; Generate Now
            </Button>
          </>
        )}
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

  // Poll while brief is GENERATING (unchanged behavior)
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

  // Initial loading
  if (brief === undefined) {
    return (
      <PageContainer width="narrow">
        <div className="pt-10" role="status" aria-label="Loading your brief">
          <PulseSpine className="mb-8" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-4 w-40" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-9 w-[85%]" />
            <Skeleton className="h-9 w-[55%]" />
          </div>
          <div className="mt-10 space-y-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // No config yet — setup
  if (!config) {
    return (
      <PageContainer width="narrow">
        <div className="flex min-h-full items-center justify-center py-16">
          <Card className="w-full max-w-md">
            <h2 className="font-z-serif text-z-h2 font-medium text-z-text">Set up Morning Brief</h2>
            <Text tone="secondary" className="mt-2 leading-[1.6]">
              Every morning, Zevra Agents analyse your operational data and prepare a concise
              executive summary — ready before you start your day.
            </Text>
            <div className="mt-6">
              <BriefConfigForm initial={null} mode="setup" onSaved={load} />
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // No brief for today yet — offer to generate one now
  if (!brief) {
    return (
      <PageContainer width="narrow">
        <BriefHero user={user} verdict={null} canRefresh={false} />
        <div className="mt-10">
          <EmptyState
            title="No brief has been generated for today yet"
            hint={`Your next brief is scheduled for ${config.schedule_time ?? config.scheduleTime ?? '07:00'} ${config.timezone ?? 'UTC'} — or generate one now.`}
          />
          <div className="mt-6 flex justify-center">
            <Button onClick={regenerate} loading={regenerating} leadingIcon={<RefreshCw size={14} />}>
              Generate Now
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Generating
  if (brief.status === 'GENERATING') {
    return (
      <PageContainer width="narrow">
        <BriefHero user={user} verdict={null} canRefresh={false} />
        <div className="mt-10 space-y-4" role="status" aria-label="Generating your brief">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <div className="flex items-center justify-center gap-2 pt-2 text-z-caption text-z-text-3">
            <Spinner size="sm" />
            Your agents are analysing the data… this takes about 30 seconds.
          </div>
        </div>
      </PageContainer>
    );
  }

  // Failed
  if (brief.status === 'FAILED') {
    return (
      <PageContainer width="narrow">
        <BriefHero user={user} verdict={null} canRefresh={false} />
        <div className="mt-10">
          <InlineAlert variant="error" title="This morning's brief encountered an error">
            Click Regenerate to try again.
          </InlineAlert>
          <div className="mt-6 flex justify-center">
            <Button onClick={regenerate} loading={regenerating} leadingIcon={<RefreshCw size={14} />}>
              Regenerate
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Ready — parse sections
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
    <PageContainer width="narrow" className="pb-24">
      <BriefHero
        user={user}
        verdict={brief.headline}
        refreshing={regenerating}
        onRefresh={regenerate}
        canRefresh
      />

      {/* Sections */}
      <div className="mt-10 space-y-5">
        {sections.map((section, i) => (
          <BriefSection key={i} section={section} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-14 flex items-center justify-between border-t border-z-border pt-6">
        <div className="flex items-center gap-1.5 text-z-caption text-z-text-3">
          {agentsLabel && <span>Generated by {agentsLabel}</span>}
          {genTime && (
            <>
              <span>·</span>
              <Clock size={11} />
              <span>{genTime}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="link" size="sm" onClick={() => setShowSettings(true)}>Configure brief</Button>
          <Button variant="link" size="sm" onClick={regenerate} loading={regenerating}
            leadingIcon={<RefreshCw size={12} />}>
            Regenerate
          </Button>
        </div>
      </div>

      {/* Configure — same form implementation as setup */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Configure Morning Brief"
        description="Choose which agents contribute to your brief. Each covers its own domain."
        size="md"
      >
        <BriefConfigForm
          initial={config}
          mode="configure"
          onSaved={() => { setShowSettings(false); load(); }}
          onCancel={() => setShowSettings(false)}
        />
      </Dialog>
    </PageContainer>
  );
}
