import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Btn, Modal, Input, Select, Spinner, EmptyState } from '../components/Card.jsx';
import {
  Building2, Plus, Shield, Users, RefreshCw,
  CheckCircle, PauseCircle, XCircle, Pencil, Trash2,
  ChevronDown, ChevronRight, Database,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function safeArray(v) { return Array.isArray(v) ? v : []; }

const PLAN_COLORS = {
  TRIAL:        'bg-gray-100 text-gray-600',
  STANDARD:     'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-purple-100 text-purple-700',
  ENTERPRISE:   'bg-amber-100 text-amber-700',
};

const STATUS_CONFIG = {
  ACTIVE:         { icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',  label: 'Active' },
  SUSPENDED:      { icon: PauseCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Suspended' },
  DEPROVISIONED:  { icon: XCircle,     color: 'text-red-500',    bg: 'bg-red-50',    label: 'Deprovisioned' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PlanBadge({ plan }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PLAN_COLORS[plan] ?? PLAN_COLORS.STANDARD}`}>
      {plan}
    </span>
  );
}

// ── Tenant row ─────────────────────────────────────────────────────────────────

function TenantRow({ tenant, onSuspend, onActivate, onDeprovision, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = tenant.status === 'ACTIVE';
  const isDeprovisioned = tenant.status === 'DEPROVISIONED';

  return (
    <Card className="overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{tenant.name}</span>
            <StatusBadge status={tenant.status} />
            <PlanBadge plan={tenant.plan} />
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400 font-mono">{tenant.slug}</span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
              <Database size={10} />{tenant.schema_name}
            </span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Users size={10} /> max {tenant.max_users}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!isDeprovisioned && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Btn variant="ghost" size="sm" onClick={() => onEdit(tenant)} title="Edit plan / limits">
              <Pencil size={13} />
            </Btn>
            {isActive ? (
              <Btn variant="ghost" size="sm" onClick={() => onSuspend(tenant.slug)} title="Suspend tenant">
                <PauseCircle size={13} className="text-yellow-500" />
              </Btn>
            ) : (
              <Btn variant="ghost" size="sm" onClick={() => onActivate(tenant.slug)} title="Reactivate tenant">
                <CheckCircle size={13} className="text-green-500" />
              </Btn>
            )}
            {tenant.slug !== 'default' && (
              <Btn variant="ghost" size="sm" onClick={() => onDeprovision(tenant)} title="Deprovision (irreversible)">
                <Trash2 size={13} className="text-red-500" />
              </Btn>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-14 py-4 bg-gray-50/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Contact</p>
            <p className="text-sm text-gray-700">{tenant.contact_email || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Schema</p>
            <p className="text-sm text-gray-700 font-mono">{tenant.schema_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Created</p>
            <p className="text-sm text-gray-700">
              {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Tenant ID</p>
            <p className="text-xs text-gray-500 font-mono truncate">{tenant.tenant_id}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Provision modal ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  slug: '', name: '', plan: 'STANDARD', contactEmail: '',
  maxUsers: 50, adminEmail: '', adminPassword: '',
};

function ProvisionModal({ open, onClose, onProvisioned }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const reset = () => { setForm(EMPTY_FORM); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  // Auto-generate slug from name
  const handleNameChange = (v) => {
    set('name', v);
    if (!form.slug || form.slug === slugify(form.name)) {
      set('slug', slugify(v));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.admin.tenants.provision({
        slug:          form.slug,
        name:          form.name,
        plan:          form.plan,
        contactEmail:  form.contactEmail,
        maxUsers:      Number(form.maxUsers),
        adminEmail:    form.adminEmail,
        adminPassword: form.adminPassword,
      });
      reset();
      onProvisioned();
      onClose();
    } catch (err) {
      setError(err.message || 'Provisioning failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Provision New Tenant">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input
              label="Organisation name"
              placeholder="Acme Corporation"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Workspace ID (slug)
            </label>
            <input
              value={form.slug}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="acme-corp"
              required
              pattern="[a-z0-9][a-z0-9\-]{1,62}"
              className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm font-mono focus:outline-none focus:border-indigo-400"
            />
            <p className="text-xs text-gray-400 mt-0.5">Lowercase, hyphens only · cannot be changed later</p>
          </div>
          <Select label="Plan" value={form.plan} onChange={e => set('plan', e.target.value)}>
            {['TRIAL', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'].map(p =>
              <option key={p}>{p}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Contact email"
            placeholder="billing@acme.com"
            value={form.contactEmail}
            onChange={e => set('contactEmail', e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max users</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={form.maxUsers}
              onChange={e => set('maxUsers', e.target.value)}
              className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            First admin account
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Admin email"
              placeholder="admin@acme.com"
              value={form.adminEmail}
              onChange={e => set('adminEmail', e.target.value)}
            />
            <Input
              label="Temporary password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.adminPassword}
              onChange={e => set('adminPassword', e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            The tenant admin will use these credentials at first login.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="secondary" type="button" onClick={handleClose}>Cancel</Btn>
          <Btn
            type="submit"
            disabled={saving || !form.slug || !form.name || !form.adminEmail || !form.adminPassword}
          >
            {saving ? <Spinner size={4} /> : <Plus size={13} />}
            {saving ? 'Provisioning…' : 'Provision tenant'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────────

function EditModal({ open, tenant, onClose, onSaved }) {
  const [plan, setPlan]       = useState('');
  const [maxUsers, setMaxUsers] = useState(50);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (tenant) { setPlan(tenant.plan); setMaxUsers(tenant.max_users); setError(''); }
  }, [tenant]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.admin.tenants.update(tenant.slug, { plan, maxUsers: Number(maxUsers) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit — ${tenant?.name || ''}`}>
      <form onSubmit={submit} className="space-y-4">
        <Select label="Plan" value={plan} onChange={e => setPlan(e.target.value)}>
          {['TRIAL', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'].map(p =>
            <option key={p}>{p}</option>)}
        </Select>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max users</label>
          <input
            type="number" min={1} max={9999}
            value={maxUsers}
            onChange={e => setMaxUsers(e.target.value)}
            className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" type="button" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>
            {saving ? <Spinner size={4} /> : <Pencil size={13} />} Save changes
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TenantAdmin() {
  const [tenants, setTenants]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showProvision, setShowProvision] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setTenants(safeArray(await api.admin.tenants.list())); }
    catch { setTenants([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const suspend = async (slug) => {
    if (!confirm(`Suspend tenant "${slug}"? Users will lose access immediately.`)) return;
    await api.admin.tenants.suspend(slug).catch(e => alert(e.message));
    load();
  };

  const activate = async (slug) => {
    await api.admin.tenants.update(slug, { status: 'ACTIVE' }).catch(e => alert(e.message));
    load();
  };

  const deprovision = async (tenant) => {
    const confirmed = window.prompt(
      `This permanently deletes all data for "${tenant.name}".\nType the workspace ID to confirm:`
    );
    if (confirmed !== tenant.slug) { alert('Cancelled — workspace ID did not match.'); return; }
    await api.admin.tenants.deprovision(tenant.slug).catch(e => alert(e.message));
    load();
  };

  const active      = tenants.filter(t => t.status === 'ACTIVE');
  const suspended   = tenants.filter(t => t.status === 'SUSPENDED');
  const deprovisioned = tenants.filter(t => t.status === 'DEPROVISIONED');

  return (
    <div className="flex-1 overflow-auto p-6">
      <PageHeader
        title="Tenant Management"
        subtitle="Provision, configure, and manage isolated customer workspaces"
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" onClick={load}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </Btn>
            <Btn size="sm" onClick={() => setShowProvision(true)}>
              <Plus size={13} /> Provision tenant
            </Btn>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active tenants',  value: active.length,       color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
          { label: 'Suspended',       value: suspended.length,    color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
          { label: 'Deprovisioned',   value: deprovisioned.length, color: 'text-red-500',   bg: 'bg-red-50',    border: 'border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-5 py-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants yet"
          body="Provision your first tenant to get started. Each tenant gets an isolated PostgreSQL schema."
        />
      ) : (
        <div className="space-y-2">
          {tenants.map(t => (
            <TenantRow
              key={t.tenant_id}
              tenant={t}
              onSuspend={suspend}
              onActivate={activate}
              onDeprovision={deprovision}
              onEdit={t => setEditTarget(t)}
            />
          ))}
        </div>
      )}

      <ProvisionModal
        open={showProvision}
        onClose={() => setShowProvision(false)}
        onProvisioned={load}
      />

      <EditModal
        open={!!editTarget}
        tenant={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />
    </div>
  );
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);
}
