import { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { api } from '../api.js';

/**
 * Business Concept Transparency — a collapsed section beneath every answer listing the
 * business concepts Zevra resolved while answering (one row per ResolvedQuestion.Resolution,
 * ChatResponse.reasoningSteps entries with {type: 'resolution'}). The answer text itself is
 * never touched — concepts are never extracted from rendered markdown/tables, only from the
 * resolution list already computed server-side. Selecting a concept opens its detail panel;
 * nothing here is inferred beyond what the backend actually resolved.
 *
 * Props:
 *   steps  — ChatResponse.reasoningSteps (same array ReasoningTrace consumes)
 *   runKey — the run this answer belongs to, for scoping "Improve Zevra" feedback
 */
export default function BusinessUnderstanding({ steps = [], runKey = null }) {
  const [open,           setOpen]           = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null); // surface string, or null

  const concepts = steps.filter(s => s.type === 'resolution');
  if (concepts.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11.5px] font-medium text-gray-400 hover:text-gray-600 transition-colors w-full text-left"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Business Understanding ({concepts.length} concept{concepts.length !== 1 ? 's' : ''})
      </button>

      {open && (
        <div className="mt-2.5 space-y-1.5">
          {concepts.map((c, i) => (
            <ConceptRow
              key={`${c.surface}-${i}`}
              concept={c}
              runKey={runKey}
              selected={selectedConcept === c.surface}
              onToggle={() => setSelectedConcept(sel => sel === c.surface ? null : c.surface)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Knowledge source labeling ────────────────────────────────────────────────────
// Derived entirely from Resolution.tier — never a claim more specific than the data
// supports. "company" covers glossary/entity/value-domain/column matches alike (the
// resolver does not preserve which one produced the match, so we don't pretend it does).
function knowledgeSource(tier) {
  if (tier === 'company') return 'Enterprise Metadata';
  if (typeof tier === 'string' && tier.startsWith('pack:')) return 'Industry Standard Glossary';
  return 'Unknown';
}

function whyThisUnderstanding(tier) {
  if (tier === 'company') {
    return 'Resolved from this tenant’s own enterprise metadata or business vocabulary.';
  }
  if (typeof tier === 'string' && tier.startsWith('pack:')) {
    return 'Resolved from an industry-standard glossary, not your company’s own definitions.';
  }
  return 'Zevra could not determine a specific source for this mapping.';
}

function ConceptRow({ concept, runKey, selected, onToggle }) {
  const source = knowledgeSource(concept.tier);
  const businessObjects = Array.isArray(concept.businessObjects) ? concept.businessObjects : [];

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`grid h-[14px] w-[14px] flex-none place-items-center rounded-full border ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
            {selected && <Check size={9} strokeWidth={3} className="text-white" />}
          </span>
          <span className="text-[12.5px] font-semibold text-gray-700 truncate">{concept.surface}</span>
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
          {source}
        </span>
      </button>

      {selected && (
        <ConceptDetail concept={concept} runKey={runKey} source={source}
          businessObjects={businessObjects} />
      )}
    </div>
  );
}

function ConceptDetail({ concept, runKey, source, businessObjects }) {
  const [feedbackMode, setFeedbackMode] = useState(null); // 'definition' | 'incorrect' | null

  return (
    <div className="px-3 py-2.5 space-y-2 text-[11.5px] border-t border-gray-100">
      <Field label="Knowledge Source" value={source} />
      <Field label="Enterprise Definition" value="Not Available"
        hint="No enterprise-authored definition is currently reachable for this term." />
      <Field label="Enterprise Metadata">
        <code className="px-1 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10.5px] text-gray-600 font-mono">
          {concept.target}
        </code>
      </Field>
      <Field label="Business Objects"
        value={businessObjects.length > 0 ? businessObjects.join(', ') : '—'} />

      <div className="pt-1">
        <p className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide">Why Zevra used this understanding</p>
        <p className="mt-0.5 text-gray-500 italic leading-snug">{whyThisUnderstanding(concept.tier)}</p>
      </div>

      {!feedbackMode ? (
        <div className="flex items-center gap-3 pt-1.5">
          <button onClick={() => setFeedbackMode('definition')}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
            Add Enterprise Definition
          </button>
          <button onClick={() => setFeedbackMode('incorrect')}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Report Incorrect Understanding
          </button>
        </div>
      ) : (
        <ConceptFeedbackForm
          concept={concept.surface}
          runKey={runKey}
          mode={feedbackMode}
          onDone={() => setFeedbackMode(null)}
        />
      )}
    </div>
  );
}

function Field({ label, value, children, hint }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-right min-w-0">
        {children ?? <span className="text-gray-700 font-medium">{value}</span>}
        {hint && <span className="block text-[10px] text-gray-400 mt-0.5 max-w-[26ch]">{hint}</span>}
      </span>
    </div>
  );
}

// ── Improve Zevra — structured, concept-scoped feedback ─────────────────────────
// Reuses the existing POST /chat/runs/{runKey}/feedback endpoint (additive `concept` +
// `category` fields). This is a review-workflow capture only — nothing here updates
// metadata or teaches Zevra automatically.
const CATEGORIES = [
  'Wrong business definition',
  'Wrong terminology',
  'Wrong enterprise mapping',
  'Missing enterprise knowledge',
  'Wrong recommendation',
];

function ConceptFeedbackForm({ concept, runKey, mode, onDone }) {
  const [category, setCategory] = useState(
    mode === 'definition' ? 'Missing enterprise knowledge' : CATEGORIES[0],
  );
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const submit = async () => {
    if (!runKey || submitting) return;
    setSubmitting(true);
    try {
      await api.chat.feedback(runKey, {
        rating: 'UNDERSTANDING_FEEDBACK',
        concept,
        category,
        comment,
      });
      setSubmitted(true);
      setTimeout(onDone, 1200);
    } catch (_) {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <p className="pt-1.5 text-[11px] text-emerald-700 font-medium">Thanks — this has been recorded for review.</p>;
  }

  return (
    <div className="pt-1.5 space-y-2 border-t border-gray-100 mt-1.5">
      <p className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide">
        Improve Zevra&rsquo;s understanding of &ldquo;{concept}&rdquo;
      </p>
      <div className="space-y-1">
        {CATEGORIES.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={`category-${concept}`} checked={category === opt}
              onChange={() => setCategory(opt)} className="accent-emerald-600" />
            <span className="text-gray-600">{opt}</span>
          </label>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Comments (optional)"
        rows={2}
        className="w-full text-[11.5px] p-1.5 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={submitting || !runKey}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        <button onClick={onDone} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </div>
      {!runKey && (
        <p className="text-[10px] text-amber-600">This answer doesn&rsquo;t have a run reference yet — try again once it finishes loading.</p>
      )}
    </div>
  );
}
