import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import { Spinner } from '../components/Card.jsx';
import AgentStepTrace from '../components/agents/AgentStepTrace.jsx';
import {
  ArrowLeft, Send, Bot, Clock, Database, CheckCircle,
  AlertCircle, Loader, ChevronRight, ChevronDown, FlaskConical
} from 'lucide-react';

function ReasoningToggle({ steps, status }) {
  const [open, setOpen] = React.useState(false);
  const toolCalls = (steps ?? []).filter(s => s.type === 'TOOL_CALL');
  if (!toolCalls.length && status !== 'RUNNING') return null;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-[#F9FAFB]
                   hover:bg-[#F3F4F6] transition-colors text-left">
        <FlaskConical size={13} className="text-[#6B7280]" />
        <span className="flex-1 text-[12px] font-medium text-[#6B7280]">
          Reasoning — {toolCalls.length} data lookup{toolCalls.length !== 1 ? 's' : ''}
        </span>
        {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <AgentStepTrace steps={steps} status={status} />
        </div>
      )}
    </div>
  );
}

function statusIcon(status) {
  switch (status) {
    case 'COMPLETED':  return <CheckCircle size={13} className="text-[#059669]" />;
    case 'FAILED':
    case 'MAX_ITER':   return <AlertCircle size={13} className="text-red-500" />;
    case 'RUNNING':    return <Loader size={13} className="animate-spin text-[#3B82F6]" />;
    default:           return null;
  }
}

function SessionListItem({ session, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2
                  ${selected ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'}`}>
      <div className="mt-0.5">{statusIcon(session.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-[#111827] truncate">
          {session.input_message ?? session.inputMessage}
        </div>
        <div className="text-[11px] text-[#9CA3AF] mt-0.5">
          {session.iterations_used ?? session.iterationsUsed ?? 0} steps ·{' '}
          {new Date(session.started_at ?? session.startedAt).toLocaleTimeString()}
        </div>
      </div>
      <ChevronRight size={12} className="text-gray-300 mt-0.5 flex-shrink-0" />
    </button>
  );
}

export default function AgentChat({ agentId }) {
  const [agent, setAgent]           = useState(null);
  const [sessions, setSessions]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [message, setMessage]       = useState('');
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);
  const textareaRef                 = useRef(null);

  const load = async () => {
    const [a, s] = await Promise.all([
      api.zevraAgents.get(agentId),
      api.zevraAgents.sessions(agentId),
    ]);
    setAgent(a);
    setSessions(s ?? []);
    if (!selected && s?.length > 0) setSelected(s[0]);
  };

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, [agentId]);

  const send = async () => {
    const msg = message.trim();
    if (!msg || sending) return;
    setSending(true); setError('');
    try {
      const session = await api.zevraAgents.chat(agentId, msg);
      setMessage('');
      await load();
      setSelected(session);
    } catch (e) {
      setError(e.message || 'Chat failed');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
  };

  const selectedSteps = (() => {
    if (!selected) return [];
    try {
      const raw = selected.steps_json ?? selected.stepsJson ?? selected.steps;
      if (typeof raw === 'string') return JSON.parse(raw);
      if (Array.isArray(raw))     return raw;
    } catch { }
    return [];
  })();

  if (loading) return (
    <div className="flex-1 flex items-center justify-center"><Spinner /></div>
  );

  if (!agent) return (
    <div className="flex-1 flex items-center justify-center text-[#9CA3AF] text-[13px]">
      Agent not found.
    </div>
  );

  const connKeys = agent.connection_keys ?? agent.connectionKeys ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── Left sidebar: agent info + session history ── */}
      <div className="w-[260px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">

        {/* Back + agent header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <button onClick={() => navigate('/agents')}
            className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#111827]
                       mb-3 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-emerald-100 to-emerald-300
                            flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-emerald-700" strokeWidth={1.6} />
            </div>
            <div>
              <div className="text-[13.5px] font-semibold text-[#111827]">{agent.name}</div>
              <div className="text-[11px] text-[#9CA3AF]">{agent.status}</div>
            </div>
          </div>
          <p className="text-[11.5px] text-[#6B7280] leading-[1.5]">{agent.goal}</p>

          {connKeys.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {connKeys.map(k => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F4F6]
                                         rounded-full text-[10.5px] text-[#6B7280]">
                  <Database size={9} /> {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Session history */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[10.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide px-2 py-2">
            Past sessions
          </div>
          {sessions.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF] text-center py-6">No sessions yet</p>
          ) : (
            sessions.map(s => (
              <SessionListItem
                key={s.id}
                session={s}
                selected={selected?.id === s.id}
                onClick={() => setSelected(s)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Main: chat input + step trace ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#FAFAFA]">

        {/* Main conversation area */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-2xl mx-auto space-y-4">

              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-[#111827] text-white rounded-2xl rounded-tr-sm
                                px-4 py-3 text-[13.5px] leading-[1.6] max-w-[85%]">
                  {selected.input_message ?? selected.inputMessage}
                </div>
              </div>

              {/* Running indicator */}
              {selected.status === 'RUNNING' && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-sm">
                  <Loader size={14} className="animate-spin text-[#6B7280]" />
                  <span className="text-[13px] text-[#6B7280]">Thinking…</span>
                </div>
              )}

              {/* Final answer — shown first and prominently */}
              {selected.status === 'COMPLETED' && selected.final_output && (
                <div className="flex items-start gap-3">
                  <div className="w-[30px] h-[30px] rounded-[9px] bg-gradient-to-br from-emerald-100 to-emerald-300
                                  flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={15} className="text-emerald-700" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3.5">
                    <p className="text-[13.5px] text-[#111827] leading-[1.7] whitespace-pre-wrap">
                      {selected.final_output}
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {(selected.status === 'FAILED' || selected.status === 'MAX_ITER') && (
                <div className="flex items-start gap-3">
                  <div className="w-[30px] h-[30px] rounded-[9px] bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle size={14} className="text-red-500" />
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-[13px] font-medium text-red-700 mb-0.5">
                      {selected.status === 'MAX_ITER' ? 'Max reasoning steps reached' : 'Error'}
                    </p>
                    <p className="text-[12.5px] text-red-600">
                      {selected.error_message ?? selected.errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Reasoning steps — collapsed by default */}
              <ReasoningToggle steps={selectedSteps} status={selected.status} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-[48px] h-[48px] rounded-[14px] bg-gradient-to-br from-emerald-100 to-emerald-300
                              flex items-center justify-center">
                <Bot size={22} className="text-emerald-700" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#111827]">{agent.name}</div>
                <div className="text-[12.5px] text-[#9CA3AF] mt-1">
                  Type a message below to start a conversation
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white px-5 py-4">
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg
                            text-[12px] text-red-600">
              {error}
            </div>
          )}
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              rows={2}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask ${agent.name} something… (⌘+Enter to send)`}
              disabled={sending}
              className="flex-1 px-4 py-2.5 text-[13px] border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-1 focus:ring-[#111827] resize-none
                         disabled:opacity-50 bg-[#FAFAFA]"
            />
            <button
              onClick={send}
              disabled={sending || !message.trim()}
              className="flex items-center justify-center w-[40px] h-[40px] bg-[#111827] text-white
                         rounded-xl hover:bg-[#1F2937] disabled:opacity-40 transition-colors flex-shrink-0">
              {sending ? <Spinner size={4} /> : <Send size={15} />}
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[11px] text-[#9CA3AF]">
              <Clock size={10} className="inline mr-1" />
              max {agent.max_iterations ?? agent.maxIterations ?? 10} reasoning steps
            </span>
            {connKeys.length > 0 && (
              <span className="text-[11px] text-[#9CA3AF]">
                <Database size={10} className="inline mr-1" />
                {connKeys.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
