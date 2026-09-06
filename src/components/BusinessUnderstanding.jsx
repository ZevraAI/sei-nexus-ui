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
    <div className="mt-2 pt-2 border-t border-z-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11.5px] font-medium text-z-text-3 hover:text-z-text-2 transition-colors w-full text-left"
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
    <div className="rounded-lg border border-z-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-z-card-2 hover:bg-z-hover transition-colors text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="grid h-[14px] w-[14px] flex-none place-items-center rounded-full border"
            style={selected
              ? { borderColor: 'var(--z-primary)', background: 'var(--z-primary)' }
              : { borderColor: 'var(--z-border-strong)' }}
          >
            {selected && <Check size={9} strokeWidth={3} style={{ color: 'var(--z-primary-on)' }} />}
          </span>
          <span className="text-[12.5px] font-semibold text-z-text truncate">{concept.surface}</span>
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: 'var(--z-primary-soft)', color: 'var(--z-primary)' }}>
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
    <div className="px-3 py-2.5 space-y-2 text-[11.5px] border-t border-z-border">
      <Field label="Knowledge Source" value={source} />
      <Field label="Enterprise Definition" value="Not Available"
        hint="No enterprise-authored definition is currently reachable for this term." />
      <Field label="Enterprise Metadata">
        <code className="px-1 py-0.5 border rounded text-[10.5px] font-mono"
          style={{ background: 'var(--z-card-2)', borderColor: 'var(--z-border)', color: 'var(--z-text-2)' }}>
          {concept.target}
        </code>
      </Field>
      <Field label="Business Objects"
        value={businessObjects.length > 0 ? businessObjects.join(', ') : '—'} />

      <div className="pt-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-z-text-2">Why Zevra used this understanding</p>
        <p className="mt-0.5 italic leading-snug text-z-text-3">{whyThisUnderstanding(concept.tier)}</p>
      </div>

      {!feedbackMode ? (
        <div className="flex items-center gap-3 pt-1.5">
          <button onClick={() => setFeedbackMode('definition')}
            className="text-[11px] font-medium transition-colors"
            style={{ color: 'var(--z-primary)' }}>
            Add Enterprise Definition
          </button>
          <button onClick={() => setFeedbackMode('incorrect')}
            className="text-[11px] font-medium text-z-text-3 hover:text-z-text-2 transition-colors">
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
      <span className="text-z-text-3 shrink-0">{label}</span>
      <span className="text-right min-w-0">
        {children ?? <span className="font-medium text-z-text">{value}</span>}
        {hint && <span className="block text-[10px] mt-0.5 max-w-[26ch] text-z-text-3">{hint}</span>}
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
    return <p className="pt-1.5 text-[11px] font-medium" style={{ color: 'var(--z-primary)' }}>Thanks — this has been recorded for review.</p>;
  }

  return (
    <div className="pt-1.5 space-y-2 border-t border-z-border mt-1.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-z-text-2">
        Improve Zevra&rsquo;s understanding of &ldquo;{concept}&rdquo;
      </p>
      <div className="space-y-1">
        {CATEGORIES.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={`category-${concept}`} checked={category === opt}
              onChange={() => setCategory(opt)} style={{ accentColor: 'var(--z-primary)' }} />
            <span className="text-z-text-2">{opt}</span>
          </label>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Comments (optional)"
        rows={2}
        className="w-full text-[11.5px] p-1.5 border rounded-md resize-none focus:outline-none focus:ring-[3px]"
        style={{ borderColor: 'var(--z-border-strong)', background: 'var(--z-surface)', color: 'var(--z-text)' }}
        onFocus={e => { e.target.style.boxShadow = '0 0 0 3px var(--z-focus-ring)'; }}
        onBlur={e => { e.target.style.boxShadow = 'none'; }}
      />
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={submitting || !runKey}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
          style={{ background: 'var(--z-primary)', color: 'var(--z-primary-on)' }}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        <button onClick={onDone} className="text-[11px] text-z-text-3 hover:text-z-text-2 transition-colors">
          Cancel
        </button>
      </div>
      {!runKey && (
        <p className="text-[10px]" style={{ color: 'var(--z-warning)' }}>This answer doesn&rsquo;t have a run reference yet — try again once it finishes loading.</p>
      )}
    </div>
  );
}
