import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  PageContainer, PageHeader, Card, Button, IconButton, Badge, statusKind, Chip,
  Dialog, Field, Input, Select, SegmentedControl, InlineAlert, EmptyState, Skeleton, Spinner,
} from '../ds';
import {
  Calendar, ChevronRight, Clock, Mail, MessageSquare, Pencil, Play, Plus, Slack, Trash2,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function safeArray(v) { return Array.isArray(v) ? v : []; }

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function scheduleLabel(r) {
  const t = r.schedule_time ?? r.scheduleTime ?? '08:00';
  const tz = r.timezone ?? 'UTC';
  const type = (r.schedule_type ?? r.scheduleType ?? 'WEEKLY').toUpperCase();
  if (type === 'DAILY')   return `Every day at ${t} ${tz}`;
  const dow = r.schedule_day_of_week ?? r.scheduleDayOfWeek;
  if (type === 'WEEKLY')  return `Every ${titleCase(dow)} at ${t} ${tz}`;
  const dom = r.schedule_day_of_month ?? r.scheduleDayOfMonth ?? 1;
  return `Monthly on day ${dom} at ${t} ${tz}`;
}

function titleCase(s) {
  if (!s) return 'Monday';
  const map = { MON:'Monday',TUE:'Tuesday',WED:'Wednesday',THU:'Thursday',
                FRI:'Friday',SAT:'Saturday',SUN:'Sunday' };
  return map[s.toUpperCase().slice(0,3)] ?? s;
}

const CHANNEL_ICON = { EMAIL: Mail, SLACK: Slack, BOTH: MessageSquare };

/** Reports-specific labelled group — mirrors Field styling but is not a <label>
 *  (SegmentedControl is a radiogroup; wrapping it in a label misroutes clicks). */
function Group({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-z-caption font-medium text-z-text-2">
        {label}
        {hint && <span className="ml-2 font-normal text-z-text-3">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

// ── Schedule picker (Reports-specific business component, DS primitives only) ───

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINS  = ['00', '15', '30', '45'];
const TIMEZONES = ['UTC','America/New_York','America/Chicago','America/Los_Angeles',
  'Europe/London','Europe/Paris','Europe/Berlin',
  'Asia/Kolkata','Asia/Singapore','Australia/Sydney'];

function SchedulePicker({ value, onChange }) {
  const [type, setType]     = useState(value.scheduleType || 'WEEKLY');
  const [hour, setHour]     = useState((value.scheduleTime || '08:00').split(':')[0]);
  const [min,  setMin]      = useState((value.scheduleTime || '08:00').split(':')[1] || '00');
  const [dow,  setDow]      = useState(value.scheduleDayOfWeek || 'MON');
  const [dom,  setDom]      = useState(value.scheduleDayOfMonth ?? 1);
  const [tz,   setTz]       = useState(value.timezone || 'UTC');

  const emit = (updates) => {
    const next = { type: type, time: `${hour}:${min}`, dow, dom: Number(dom), tz, ...updates };
    onChange({
      scheduleType:       next.type,
      scheduleTime:       next.time,
      scheduleDayOfWeek:  next.dow,
      scheduleDayOfMonth: next.dom,
      timezone:           next.tz,
    });
  };

  const upd = (setter, key, val) => { setter(val); emit({ [key]: val }); };

  return (
    <div className="space-y-3">
      {/* Type */}
      <SegmentedControl
        aria-label="Schedule frequency"
        className="w-full"
        value={type}
        onChange={(t) => upd(setType, 'type', t)}
        options={['DAILY','WEEKLY','MONTHLY'].map(t => ({
          value: t, label: t.charAt(0) + t.slice(1).toLowerCase(),
        }))}
      />

      {/* Day of week */}
      {type === 'WEEKLY' && (
        <Group label="Day">
          <SegmentedControl
            aria-label="Day of week"
            size="sm"
            className="w-full"
            value={dow}
            onChange={(d) => upd(setDow, 'dow', d)}
            options={DAYS.map(d => ({ value: d, label: d.slice(0,1) + d.slice(1,2).toLowerCase() }))}
          />
        </Group>
      )}

      {/* Day of month */}
      {type === 'MONTHLY' && (
        <Field label="Day of Month">
          <Select value={dom} onChange={e => upd(setDom, 'dom', e.target.value)}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </Field>
      )}

      {/* Time + timezone */}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Hour">
          <Select value={hour} onChange={e => upd(setHour, 'time', `${e.target.value}:${min}`)}>
            {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
          </Select>
        </Field>
        <Field label="Minute">
          <Select value={min} onChange={e => upd(setMin, 'time', `${hour}:${e.target.value}`)}>
            {MINS.map(m => <option key={m} value={m}>:{m}</option>)}
          </Select>
        </Field>
        <Field label="Timezone">
          <Select value={tz} onChange={e => upd(setTz, 'tz', e.target.value)}>
            {TIMEZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </Select>
        </Field>
      </div>
    </div>
  );
}

// ── Questions editor (Reports-specific business component, DS primitives only) ──

function QuestionsEditor({ questions, onChange }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const q = draft.trim();
    if (!q) return;
    onChange([...questions, q]);
    setDraft('');
  };

  const remove = (i) => onChange(questions.filter((_, j) => j !== i));
  const update = (i, val) => onChange(questions.map((q, j) => j === i ? val : q));

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-z-round bg-z-primary text-[10px] font-bold text-z-on-accent">
            {i + 1}
          </span>
          <Input className="flex-1" value={q} onChange={e => update(i, e.target.value)} />
          <IconButton label={`Remove question ${i + 1}`} onClick={() => remove(i)}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ))}

      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-z-round border-2 border-dashed border-z-border-strong text-[10px] font-bold text-z-text-3">
          +
        </span>
        <Input
          className="flex-1"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type a question and press Enter…"
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>

      {questions.length === 0 && (
        <p className="mt-1 text-z-caption text-z-text-3">
          Add the questions Zevra will re-ask every time this report runs.
          Each question generates one section in the report.
        </p>
      )}
    </div>
  );
}

// ── Report modal (create / edit) ──────────────────────────────────────────────

function ReportModal({ open, report, onSave, onClose }) {
  const editing = !!report;

  const [name,        setName]        = useState(report?.name ?? '');
  const [description, setDescription] = useState(report?.description ?? '');
  const [questions,   setQuestions]   = useState(
    report?.questions_json ? JSON.parse(report.questions_json) : []
  );
  const [agentKey,    setAgentKey]    = useState(report?.agent_key ?? '');
  const [schedule,    setSchedule]    = useState({
    scheduleType:       report?.schedule_type ?? 'WEEKLY',
    scheduleTime:       report?.schedule_time ?? '08:00',
    scheduleDayOfWeek:  report?.schedule_day_of_week ?? 'MON',
    scheduleDayOfMonth: report?.schedule_day_of_month ?? 1,
    timezone:           report?.timezone ?? 'UTC',
  });
  const [channel,      setChannel]      = useState(report?.channel ?? 'EMAIL');
  const [slackWebhook, setSlackWebhook] = useState(report?.slack_webhook ?? '');
  const [emailTo,      setEmailTo]      = useState(report?.email_to ?? '');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Report name is required'); return; }
    if (questions.length === 0) { setError('Add at least one question'); return; }
    if ((channel === 'EMAIL' || channel === 'BOTH') && !emailTo.trim()) {
      setError('Email recipients are required for Email delivery'); return;
    }
    if ((channel === 'SLACK' || channel === 'BOTH') && !slackWebhook.trim()) {
      setError('Slack webhook URL is required for Slack delivery'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        name, description,
        questions,
        agentKey: agentKey || null,
        ...schedule,
        channel,
        slackWebhook: slackWebhook || null,
        emailTo:      emailTo || null,
      };
      if (editing) {
        await api.reports.update(report.report_key, payload);
      } else {
        await api.reports.create(payload);
      }
      onSave();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit — ${report.name}` : 'New Scheduled Report'}
      description="Pin an investigation as a recurring report delivered on your schedule."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner size="xs" /> : editing ? <Pencil size={13} /> : <Plus size={13} />}
            {editing ? 'Save Changes' : 'Create Report'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Name + description */}
        <div className="space-y-3">
          <Field label="Report Name *">
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="Weekly Supplier Health Check" />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Summarises supplier performance, overdue orders and inventory risk" />
          </Field>
        </div>

        {/* Questions */}
        <Group label="Questions *" hint="Each question becomes one section in the report">
          <QuestionsEditor questions={questions} onChange={setQuestions} />
        </Group>

        {/* Schedule */}
        <Group label="Schedule">
          <div className="rounded-z-lg border border-z-border bg-z-card-2 p-4">
            <SchedulePicker value={schedule} onChange={setSchedule} />
          </div>
        </Group>

        {/* Agent key */}
        <Field label="Agent Key (optional)">
          <Input value={agentKey} onChange={e => setAgentKey(e.target.value)}
            placeholder="data-analyst — leave blank to use the default agent" />
        </Field>

        {/* Delivery */}
        <Group label="Delivery Channel">
          <SegmentedControl
            aria-label="Delivery channel"
            className="w-full"
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'EMAIL', label: 'Email', icon: <Mail size={13} /> },
              { value: 'SLACK', label: 'Slack', icon: <Slack size={13} /> },
              { value: 'BOTH',  label: 'Both',  icon: <MessageSquare size={13} /> },
            ]}
          />

          {(channel === 'EMAIL' || channel === 'BOTH') && (
            <Field label="Email Recipients (comma-separated) *" className="mt-3">
              <Input value={emailTo} onChange={e => setEmailTo(e.target.value)}
                placeholder="analyst@company.com, manager@company.com" />
            </Field>
          )}

          {(channel === 'SLACK' || channel === 'BOTH') && (
            <Field label="Slack Webhook URL *" className="mt-3">
              <Input value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..." />
            </Field>
          )}
        </Group>

        {error && <InlineAlert variant="error">{error}</InlineAlert>}
      </div>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [running,    setRunning]    = useState(null);
  const [runResult,  setRunResult]  = useState(null);

  const load = () =>
    api.reports.list()
      .then(r => setReports(safeArray(r)))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTarget(null); setShowModal(true); };
  const openEdit   = (r) => { setEditTarget(r);   setShowModal(true); };

  const deleteReport = async (key) => {
    if (!confirm('Archive this report? It will stop running.')) return;
    await api.reports.delete(key).catch(() => {});
    setReports(prev => prev.filter(r => (r.report_key ?? r.reportKey) !== key));
  };

  const runNow = async (key, name) => {
    setRunning(key);
    setRunResult(null);
    try {
      const result = await api.reports.run(key);
      setRunResult({ name, ...result });
    } catch (e) {
      setRunResult({ name, status: 'FAILED', error: e.message });
    } finally {
      setRunning(null);
      await load();
    }
  };

  const runOk = runResult && (runResult.status === 'SUCCESS' || runResult.sections_ran > 0);

  return (
    <PageContainer className="py-8">
      <PageHeader
        className="mb-8"
        title="Scheduled Reports"
        summary="Pin investigations as recurring reports delivered by email or Slack on your schedule"
        actions={<Button onClick={openCreate}><Plus size={14} /> New Report</Button>}
      />

      {/* Run result banner */}
      {runResult && (
        <InlineAlert
          className="mb-5"
          variant={runOk ? 'success' : 'error'}
          onDismiss={() => setRunResult(null)}
          title={
            runResult.status === 'SUCCESS'
              ? `“${runResult.name}” ran successfully — ${runResult.sections_ran} sections delivered`
              : `“${runResult.name}” completed with issues`
          }
        >
          {runResult.errors?.length > 0
            ? runResult.errors.join(' · ')
            : runResult.schedule_description
              ? `Next run: ${runResult.schedule_description}`
              : runResult.error || null}
        </InlineAlert>
      )}

      {/* Report list */}
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading reports">
          <Skeleton className="h-[132px]" />
          <Skeleton className="h-[132px]" />
          <Skeleton className="h-[132px]" />
        </div>
      ) : reports.length === 0 ? (
        <div>
          <EmptyState
            title="No scheduled reports yet"
            hint="Create a report to automatically re-run your investigations and deliver results to your team by email or Slack."
          />
          <div className="mt-6 flex justify-center">
            <Button onClick={openCreate}><Plus size={14} /> Create your first report</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const key       = r.report_key ?? r.reportKey;
            const status    = r.status ?? 'ACTIVE';
            const channel   = r.channel ?? 'EMAIL';
            const ChIcon    = CHANNEL_ICON[channel] ?? Mail;
            const questions = (() => {
              try { return JSON.parse(r.questions_json ?? '[]'); }
              catch { return []; }
            })();
            const isRunning = running === key;

            return (
              <Card key={key}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-z-md bg-z-primary-soft">
                    <Calendar size={18} className="text-z-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-z-body font-medium text-z-text">{r.name}</span>
                      <Badge status={statusKind(status)}>{status}</Badge>
                      <Chip><ChIcon size={11} /> {channel}</Chip>
                    </div>

                    {/* Description */}
                    {r.description && (
                      <p className="mb-2 text-z-caption text-z-text-2">{r.description}</p>
                    )}

                    {/* Schedule + meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-z-caption text-z-text-3">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {scheduleLabel(r)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ChevronRight size={11} /> {questions.length} question{questions.length !== 1 ? 's' : ''}
                      </span>
                      {r.last_run_at && (
                        <span>Last run: <strong className="text-z-text-2">{fmtDate(r.last_run_at)}</strong>
                          {r.last_run_status && (
                            <span className={`ml-1 ${r.last_run_status === 'SUCCESS' ? 'text-z-up' : 'text-z-down'}`}>
                              · {r.last_run_status}
                            </span>
                          )}
                        </span>
                      )}
                      {r.next_run_at && (
                        <span>Next: <strong className="text-z-text-2">{fmtDate(r.next_run_at)}</strong></span>
                      )}
                    </div>

                    {/* Questions preview */}
                    {questions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {questions.slice(0, 3).map((q, i) => (
                          <Chip key={i} className="max-w-[220px] truncate">{i + 1}. {q}</Chip>
                        ))}
                        {questions.length > 3 && (
                          <Chip className="text-z-text-3">+{questions.length - 3} more</Chip>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => runNow(key, r.name)} disabled={isRunning}>
                      {isRunning ? <Spinner size="xs" /> : <Play size={12} />}
                      {isRunning ? 'Running…' : 'Run now'}
                    </Button>
                    <IconButton label={`Edit ${r.name}`} onClick={() => openEdit(r)}><Pencil size={14} /></IconButton>
                    <IconButton label={`Archive ${r.name}`} onClick={() => deleteReport(key)}><Trash2 size={14} /></IconButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <ReportModal
          open={showModal}
          report={editTarget}
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </PageContainer>
  );
}
