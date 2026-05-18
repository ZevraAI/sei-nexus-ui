import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Btn, EmptyState, Spinner } from '../components/Card.jsx';
import {
  Calendar, ChevronDown, ChevronRight, Clock, Mail, MessageSquare,
  Pencil, Play, Plus, RefreshCw, Slack, Trash2, X,
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
const STATUS_STYLE = {
  ACTIVE:  'bg-[#DCFCE7] text-[#15803D]',
  PAUSED:  'bg-[#FEF9C3] text-[#A16207]',
  ARCHIVED:'bg-[#F3F4F6] text-[#374151]',
};

// ── Schedule picker ───────────────────────────────────────────────────────────

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINS  = ['00', '15', '30', '45'];

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
      <div className="grid grid-cols-3 gap-2">
        {['DAILY','WEEKLY','MONTHLY'].map(t => (
          <button key={t} type="button"
            onClick={() => upd(setType, 'type', t)}
            className={`py-2 rounded-[8px] text-[13px] font-medium border transition-all
              ${type === t
                ? 'bg-[#111827] text-white border-[#111827]'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Day of week */}
      {type === 'WEEKLY' && (
        <div>
          <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">Day</label>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(d => (
              <button key={d} type="button"
                onClick={() => upd(setDow, 'dow', d)}
                className={`py-2 rounded-[7px] text-[11.5px] font-medium border transition-all
                  ${dow === d
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {d.slice(0,1) + d.slice(1,2).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day of month */}
      {type === 'MONTHLY' && (
        <div>
          <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">Day of Month</label>
          <select value={dom} onChange={e => upd(setDom, 'dom', e.target.value)}
            className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                       text-[#111827] bg-white focus:outline-none focus:border-emerald-400">
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Time + timezone */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">Hour</label>
          <select value={hour} onChange={e => upd(setHour, 'time', `${e.target.value}:${min}`)}
            className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                       text-[#111827] bg-white focus:outline-none focus:border-emerald-400">
            {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">Minute</label>
          <select value={min} onChange={e => upd(setMin, 'time', `${hour}:${e.target.value}`)}
            className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                       text-[#111827] bg-white focus:outline-none focus:border-emerald-400">
            {MINS.map(m => <option key={m} value={m}>:{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">Timezone</label>
          <select value={tz} onChange={e => upd(setTz, 'tz', e.target.value)}
            className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                       text-[#111827] bg-white focus:outline-none focus:border-emerald-400">
            {['UTC','America/New_York','America/Chicago','America/Los_Angeles',
              'Europe/London','Europe/Paris','Europe/Berlin',
              'Asia/Kolkata','Asia/Singapore','Australia/Sydney'].map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Questions editor ──────────────────────────────────────────────────────────

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
          <span className="w-5 h-5 rounded-full bg-[#111827] text-white text-[10px] font-bold
                           flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <input
            value={q}
            onChange={e => update(i, e.target.value)}
            className="flex-1 border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                       text-[#111827] bg-white focus:outline-none focus:border-emerald-400"
          />
          <button onClick={() => remove(i)}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-[6px] transition-colors">
            <X size={13} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 mt-2">
        <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 text-[10px] font-bold
                         flex items-center justify-center flex-shrink-0 text-gray-300">
          +
        </span>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type a question and press Enter…"
          className="flex-1 border border-dashed border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                     text-[#111827] bg-white/60 focus:outline-none focus:border-emerald-400
                     placeholder:text-gray-300"
        />
        <button onClick={add} disabled={!draft.trim()}
          className="px-3 py-2 bg-[#111827] text-white text-[12px] font-medium rounded-[7px]
                     hover:bg-[#1F2937] disabled:opacity-40 transition-colors">
          Add
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-[12px] text-[#9CA3AF] mt-1">
          Add the questions Zevra will re-ask every time this report runs.
          Each question generates one section in the report.
        </p>
      )}
    </div>
  );
}

// ── Report modal (create / edit) ──────────────────────────────────────────────

function ReportModal({ report, onSave, onClose }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl
                      max-h-[90vh] flex flex-col border border-gray-200/70">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-[#111827]">
            {editing ? `Edit — ${report.name}` : 'New Scheduled Report'}
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400
                       hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Name + description */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
                Report Name *
              </label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Weekly Supplier Health Check"
                className="w-full border border-gray-200 rounded-[8px] px-3 py-2.5 text-[13.5px]
                           text-[#111827] bg-white focus:outline-none focus:border-emerald-400
                           focus:ring-2 focus:ring-emerald-400/20 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
                Description
              </label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Summarises supplier performance, overdue orders and inventory risk"
                className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                           text-[#111827] bg-white focus:outline-none focus:border-emerald-400 transition-all" />
            </div>
          </div>

          {/* Questions */}
          <div>
            <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-2">
              Questions *
              <span className="ml-2 text-[11px] font-normal text-[#9CA3AF] normal-case tracking-normal">
                Each question becomes one section in the report
              </span>
            </label>
            <QuestionsEditor questions={questions} onChange={setQuestions} />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-2">
              Schedule
            </label>
            <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-4">
              <SchedulePicker value={schedule} onChange={setSchedule} />
            </div>
          </div>

          {/* Agent key */}
          <div>
            <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
              Agent Key (optional)
              <span className="ml-2 text-[11px] font-normal text-[#9CA3AF] normal-case">
                leave blank to use the default agent
              </span>
            </label>
            <input value={agentKey} onChange={e => setAgentKey(e.target.value)}
              placeholder="data-analyst"
              className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                         text-[#111827] bg-white focus:outline-none focus:border-emerald-400 transition-all" />
          </div>

          {/* Delivery */}
          <div>
            <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-2">
              Delivery Channel
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['EMAIL','SLACK','BOTH'].map(c => (
                <button key={c} type="button" onClick={() => setChannel(c)}
                  className={`py-2.5 rounded-[8px] text-[13px] font-medium border flex items-center
                              justify-center gap-1.5 transition-all
                    ${channel === c
                      ? 'bg-[#111827] text-white border-[#111827]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {c === 'EMAIL' && <Mail size={13} />}
                  {c === 'SLACK' && <Slack size={13} />}
                  {c === 'BOTH'  && <MessageSquare size={13} />}
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {(channel === 'EMAIL' || channel === 'BOTH') && (
              <div className="mb-2.5">
                <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
                  Email Recipients (comma-separated) *
                </label>
                <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
                  placeholder="analyst@company.com, manager@company.com"
                  className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                             text-[#111827] bg-white focus:outline-none focus:border-emerald-400 transition-all" />
              </div>
            )}

            {(channel === 'SLACK' || channel === 'BOTH') && (
              <div>
                <label className="block text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
                  Slack Webhook URL *
                </label>
                <input value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px]
                             text-[#111827] bg-white focus:outline-none focus:border-emerald-400 transition-all" />
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-[8px]
                            text-[13px] text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded-[8px] border border-gray-200 bg-white text-[13px]
                       font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-[8px] bg-[#111827] text-white text-[13px] font-medium
                       hover:bg-[#1F2937] disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving ? <Spinner size={4} /> : (editing ? <Pencil size={13} /> : <Plus size={13} />)}
            {editing ? 'Save Changes' : 'Create Report'}
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div className="flex-1 overflow-auto p-7 bg-transparent">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[20px] font-bold text-[#111827] tracking-[-0.025em]">
            Scheduled Reports
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Pin investigations as recurring reports delivered by email or Slack on your schedule
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-[14px] py-[7px] bg-[#111827] text-white
                     text-[13px] font-medium rounded-[8px] hover:bg-[#1F2937] transition-colors shadow-sm">
          <Plus size={13} /> New Report
        </button>
      </div>

      {/* Run result banner */}
      {runResult && (
        <div className={`mb-5 px-4 py-3.5 rounded-xl border flex items-start gap-3
          ${runResult.status === 'SUCCESS' || runResult.sections_ran > 0
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'}`}>
          <div className="flex-1">
            <p className={`text-[13.5px] font-semibold ${
              runResult.status === 'SUCCESS' ? 'text-emerald-800' : 'text-red-700'}`}>
              {runResult.status === 'SUCCESS'
                ? `✓ "${runResult.name}" ran successfully — ${runResult.sections_ran} sections delivered`
                : `"${runResult.name}" completed with issues`}
            </p>
            {runResult.errors?.length > 0 && (
              <p className="text-[12px] text-red-600 mt-0.5">{runResult.errors.join(' · ')}</p>
            )}
            {runResult.schedule_description && (
              <p className="text-[12px] text-emerald-600 mt-0.5">
                Next run: {runResult.schedule_description}
              </p>
            )}
          </div>
          <button onClick={() => setRunResult(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Report list */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100/80 flex items-center justify-center mb-4">
            <Calendar size={28} className="text-gray-300" />
          </div>
          <p className="text-[15px] font-semibold text-[#374151] mb-2">No scheduled reports yet</p>
          <p className="text-[13px] text-[#9CA3AF] text-center max-w-sm mb-6 leading-relaxed">
            Create a report to automatically re-run your investigations and deliver results
            to your team by email or Slack.
          </p>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] text-white text-[13px]
                       font-medium rounded-[9px] hover:bg-[#1F2937] transition-colors">
            <Plus size={14} /> Create your first report
          </button>
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
              <div key={key}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/70
                           shadow-sm hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center
                                    flex-shrink-0 bg-gradient-to-br from-indigo-50 to-blue-50
                                    border border-indigo-100">
                      <Calendar size={18} className="text-indigo-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[14.5px] font-semibold text-[#111827]">{r.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold
                                         ${STATUS_STYLE[status] ?? STATUS_STYLE.ACTIVE}`}>
                          {status}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]
                                         font-semibold bg-[#F3F4F6] text-[#374151]">
                          <ChIcon size={10} /> {channel}
                        </span>
                      </div>

                      {/* Description */}
                      {r.description && (
                        <p className="text-[12.5px] text-[#6B7280] mb-2">{r.description}</p>
                      )}

                      {/* Schedule + meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {scheduleLabel(r)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ChevronRight size={11} /> {questions.length} question{questions.length !== 1 ? 's' : ''}
                        </span>
                        {r.last_run_at && (
                          <span>Last run: <strong className="text-[#374151]">{fmtDate(r.last_run_at)}</strong>
                            {r.last_run_status && (
                              <span className={`ml-1 ${r.last_run_status === 'SUCCESS'
                                ? 'text-emerald-600' : 'text-red-500'}`}>
                                · {r.last_run_status}
                              </span>
                            )}
                          </span>
                        )}
                        {r.next_run_at && (
                          <span>Next: <strong className="text-[#374151]">{fmtDate(r.next_run_at)}</strong></span>
                        )}
                      </div>

                      {/* Questions preview */}
                      {questions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {questions.slice(0, 3).map((q, i) => (
                            <span key={i}
                              className="px-2.5 py-1 bg-gray-100/80 rounded-full text-[11.5px]
                                         text-[#374151] max-w-[220px] truncate">
                              {i + 1}. {q}
                            </span>
                          ))}
                          {questions.length > 3 && (
                            <span className="px-2.5 py-1 bg-gray-100/80 rounded-full text-[11.5px] text-[#9CA3AF]">
                              +{questions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => runNow(key, r.name)}
                        disabled={isRunning}
                        title="Run now"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px]
                                   font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100
                                   border border-emerald-200 transition-colors disabled:opacity-50">
                        {isRunning ? <Spinner size={3} /> : <Play size={11} />}
                        {isRunning ? 'Running…' : 'Run now'}
                      </button>
                      <button onClick={() => openEdit(r)}
                        className="p-1.5 rounded-[7px] text-gray-400 hover:text-gray-600
                                   hover:bg-gray-100 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteReport(key)}
                        className="p-1.5 rounded-[7px] text-gray-400 hover:text-red-500
                                   hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <ReportModal
          report={editTarget}
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
