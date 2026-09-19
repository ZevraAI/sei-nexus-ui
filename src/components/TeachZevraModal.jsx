import { useEffect, useState } from 'react';
import { Dialog, Button, Field, Input, Select } from '../ds';
import { api } from '../api.js';

/**
 * /TeachZevra — Explicit Teaching (Part B). A dedicated form modal, NOT a free-form chat teaching
 * mode. Flow: form → Teaching LLM proposal (not persisted) → Preview → Cancel (discard) or
 * "Save / Teach Zevra" (persist). Concept and Connection are Java-owned dropdowns — never free
 * text, never inferred.
 */
export default function TeachZevraModal({ open, onClose, onTaught }) {
  const [concepts, setConcepts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState('');

  const [form, setForm] = useState(initialForm());
  const [proposal, setProposal] = useState(null); // non-null ⇒ showing the Preview screen
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm());
    setProposal(null);
    setError('');
    setConfirmed(false);
    setLoadingOptions(true);
    setOptionsError('');
    Promise.all([api.teaching.concepts(), api.teaching.connections()])
      .then(([conceptRows, connectionRows]) => {
        setConcepts(Array.isArray(conceptRows) ? conceptRows : []);
        setConnections(Array.isArray(connectionRows) ? connectionRows : []);
      })
      .catch((err) => setOptionsError(err.message || 'Failed to load concepts/connections'))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const canSubmitForm = form.conceptKey && form.businessTerm.trim() && form.businessMeaning.trim()
      && form.scope && (form.scope !== 'CONNECTION' || form.connectionKey);

  const handleSubmitForm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const body = {
        conceptKey: form.conceptKey,
        businessTerm: form.businessTerm.trim(),
        businessMeaning: form.businessMeaning.trim(),
        scope: form.scope,
        connectionKey: form.scope === 'CONNECTION' ? form.connectionKey : null,
        examples: form.examples.trim() || null,
        businessRuleSql: form.businessRuleSql.trim() || null,
        notes: form.notes.trim() || null,
      };
      const result = await api.teaching.propose(body);
      setProposal(result);
    } catch (err) {
      setError(err.message || 'Failed to build teaching proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPreview = () => {
    // Discard — no persistence occurred, nothing to undo.
    setProposal(null);
  };

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const saved = await api.teaching.confirm(proposal);
      setConfirmed(true);
      onTaught?.(saved);
    } catch (err) {
      // Never fabricate a "learned" status if persistence failed.
      setError(err.message || 'Failed to save this teaching');
    } finally {
      setSubmitting(false);
    }
  };

  const conceptName = (key) => concepts.find((c) => c.conceptKey === key)?.name || key;
  const connectionName = (key) => connections.find((c) => c.connectionKey === key)?.name || key;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Teach Zevra"
      description="Explicitly teach Zevra a business term, definition, and (optionally) how it maps to your data."
      size="lg"
      footer={renderFooter()}
    >
      {optionsError && <p className="text-z-critical text-z-caption mb-3">{optionsError}</p>}
      {error && <p className="text-z-critical text-z-caption mb-3">{error}</p>}

      {confirmed ? (
        <div className="py-6 text-center">
          <p className="text-z-body-lg font-medium text-z-text">Zevra learned this.</p>
          <p className="text-z-caption text-z-text-2 mt-1">
            "{proposal.businessTerm}" is now recorded under concept "{conceptName(proposal.conceptKey)}".
          </p>
        </div>
      ) : proposal ? (
        renderPreview()
      ) : (
        renderForm()
      )}
    </Dialog>
  );

  function renderForm() {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Concept">
          <Select
            value={form.conceptKey}
            disabled={loadingOptions}
            onChange={(e) => setForm((f) => ({ ...f, conceptKey: e.target.value }))}
          >
            <option value="">Select a concept…</option>
            {concepts.map((c) => (
              <option key={c.conceptKey} value={c.conceptKey}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Business Term">
          <Input
            value={form.businessTerm}
            onChange={(e) => setForm((f) => ({ ...f, businessTerm: e.target.value }))}
            placeholder="e.g. open orders"
          />
        </Field>

        <Field label="Business Meaning / Definition">
          <textarea
            className="w-full rounded-z-md border border-z-border-strong bg-z-surface px-3.5 py-2.5 text-z-body text-z-text placeholder:text-z-text-muted focus:outline-none focus:border-z-primary focus:ring-[3px] focus:ring-z-focus-ring"
            rows={3}
            value={form.businessMeaning}
            onChange={(e) => setForm((f) => ({ ...f, businessMeaning: e.target.value }))}
            placeholder="What does this term mean to the business?"
          />
        </Field>

        <Field label="Scope">
          <Select
            value={form.scope}
            onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value, connectionKey: '' }))}
          >
            <option value="TENANT">Tenant-wide</option>
            <option value="CONNECTION">Specific connection</option>
          </Select>
        </Field>

        {form.scope === 'CONNECTION' && (
          <Field label="Connection">
            <Select
              value={form.connectionKey}
              disabled={loadingOptions}
              onChange={(e) => setForm((f) => ({ ...f, connectionKey: e.target.value }))}
            >
              <option value="">Select an authorized connection…</option>
              {connections.map((c) => (
                <option key={c.connectionKey} value={c.connectionKey}>{c.name}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Examples (optional)">
          <Input
            value={form.examples}
            onChange={(e) => setForm((f) => ({ ...f, examples: e.target.value }))}
          />
        </Field>

        <Field label="Business rule / SQL expression (optional)">
          <Input
            value={form.businessRuleSql}
            onChange={(e) => setForm((f) => ({ ...f, businessRuleSql: e.target.value }))}
            placeholder="e.g. status IN ('submitted','acknowledged')"
          />
        </Field>

        <Field label="Notes (optional)">
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Field>
      </div>
    );
  }

  function renderPreview() {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-z-caption text-z-text-2">Review before teaching Zevra:</p>
        <PreviewRow label="Concept" value={conceptName(proposal.conceptKey)} />
        <PreviewRow label="Business Term" value={proposal.businessTerm} />
        <PreviewRow label="Definition" value={proposal.definition} />
        <PreviewRow label="Scope" value={proposal.scope === 'CONNECTION' ? 'Specific connection' : 'Tenant-wide'} />
        {proposal.scope === 'CONNECTION' && (
          <PreviewRow label="Connection" value={connectionName(proposal.connectionKey)} />
        )}
        {proposal.sqlPattern && <PreviewRow label="SQL / Business Rule" value={proposal.sqlPattern} mono />}
      </div>
    );
  }

  function renderFooter() {
    if (confirmed) {
      return <Button variant="primary" onClick={onClose}>Done</Button>;
    }
    if (proposal) {
      return (
        <>
          <Button variant="secondary" onClick={handleCancelPreview} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} loading={submitting}>Save / Teach Zevra</Button>
        </>
      );
    }
    return (
      <>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmitForm} loading={submitting} disabled={!canSubmitForm}>
          Continue
        </Button>
      </>
    );
  }
}

function PreviewRow({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-z-caption font-medium text-z-text-2">{label}</span>
      <span className={mono ? 'font-mono text-z-caption text-z-text' : 'text-z-body text-z-text'}>{value}</span>
    </div>
  );
}

function initialForm() {
  return {
    conceptKey: '',
    businessTerm: '',
    businessMeaning: '',
    scope: 'TENANT',
    connectionKey: '',
    examples: '',
    businessRuleSql: '',
    notes: '',
  };
}
