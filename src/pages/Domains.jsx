import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Btn, EmptyState, Modal, Input, Spinner } from '../components/Card.jsx';
import { Globe, Plus, Trash2 } from 'lucide-react';

export default function Domains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ domainKey: '', name: '', description: '', ownerEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.domains.list().then(setDomains).catch(() => setDomains([])).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.domains.create(form);
      const d = await api.domains.list();
      setDomains(d);
      setShowModal(false);
      setForm({ domainKey: '', name: '', description: '', ownerEmail: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (key) => {
    if (!confirm('Delete domain?')) return;
    await api.domains.delete(key).catch(() => {});
    setDomains(ds => ds.filter(d => d.domainKey !== key));
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <PageHeader
        title="Domains"
        subtitle="Business domains partition knowledge, connections, and agent scope"
        actions={<Btn onClick={() => setShowModal(true)}><Plus size={13} /> Add Domain</Btn>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : domains.length === 0 ? (
        <EmptyState icon={Globe} title="No domains" body="Create a domain to organise agents, knowledge, and data sources." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map(d => (
            <Card key={d.domainKey} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-700">{d.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{d.domainKey}</p>
                  {d.description && <p className="text-xs text-gray-500 mt-1">{d.description}</p>}
                  {d.ownerEmail && <p className="text-xs text-gray-400 mt-1">Owner: {d.ownerEmail}</p>}
                </div>
                <Btn variant="ghost" size="sm" onClick={() => remove(d.domainKey)}>
                  <Trash2 size={13} />
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setError(''); }} title="Add Domain">
        <div className="space-y-4">
          <Input label="Domain Key (unique ID)" placeholder="invoicing" value={form.domainKey}
            onChange={e => set('domainKey', e.target.value)} />
          <Input label="Display Name" placeholder="Invoicing & Billing" value={form.name}
            onChange={e => set('name', e.target.value)} />
          <Input label="Description" placeholder="Covers AP/AR invoicing workflows" value={form.description}
            onChange={e => set('description', e.target.value)} />
          <Input label="Owner Email" placeholder="owner@company.com" value={form.ownerEmail}
            onChange={e => set('ownerEmail', e.target.value)} />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.domainKey || !form.name}>
              {saving ? <Spinner size={4} /> : <Plus size={13} />} Create
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
