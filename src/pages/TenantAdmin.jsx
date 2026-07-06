import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Btn, Modal, Input, Select, Spinner, EmptyState } from '../components/Card.jsx';
import {
  Building2, Plus, Users, RefreshCw,
  CheckCircle, PauseCircle, XCircle, Pencil, Trash2,
  ChevronDown, Database, Mail, Calendar, Hash,
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

// ── Tenant detail panel ────────────────────────────────────────────────────────

function TenantDetail({ tenant, onSuspend, onActivate, onDeprovision, onEdit }) {
  const [reinviteEmail, setReinviteEmail] = useState(tenant.contact_email || '');
  const [reinviting,   setReinviting]   = useState(false);
  const [reinviteMsg,  setReinviteMsg]  = useState('');
  const [recoveryLink, setRecoveryLink] = useState('');
  const isActive       = tenant.status === 'ACTIVE';
  const isDeprovisioned = tenant.status === 'DEPROVISIONED';

  // Reset reinvite state when the selected tenant changes
  useEffect(() => {
    setReinviteEmail(tenant.contact_email || '');
    setReinviteMsg('');
    setRecoveryLink('');
  }, [tenant.slug]);

  const sendReinvite = async () => {
    const email = reinviteEmail.trim();
    if (!email) return;
    setReinviting(true); setReinviteMsg(''); setRecoveryLink('');
    try {
      const res = await api.admin.tenants.reinvite(tenant.slug, email);
      if (res?.mode === 'recovery_link' && res?.link) {
        setRecoveryLink(res.link);
        setReinviteMsg(res.message || 'Recovery link generated.');
      } else {
        setReinviteMsg('ok');
      }
    } catch (err) {
      setReinviteMsg(err.message || 'Failed to send invite');
    } finally {
      setReinviting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
          <Building2 size={17} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{tenant.name}</span>
            <StatusBadge status={tenant.status} />
            <PlanBadge plan={tenant.plan} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400 font-mono">{tenant.slug}</span>
            <span className="text-gray-200 select-none">·</span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
              <Database size={10} /> {tenant.schema_name}
            </span>
            <span className="text-gray-200 select-none">·</span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Users size={10} /> max {tenant.max_users}
            </span>
          </div>
        </div>
        {!isDeprovisioned && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Btn variant="secondary" size="sm" onClick={() => onEdit(tenant)}>
              <Pencil size={12} /> Edit
            </Btn>
            {isActive ? (
              <Btn variant="secondary" size="sm" onClick={() => onSuspend(tenant.slug)}>
                <PauseCircle size={12} className="text-yellow-500" /> Pause
              </Btn>
            ) : (
              <Btn variant="secondary" size="sm" onClick={() => onActivate(tenant.slug)}>
                <CheckCircle size={12} className="text-green-500" /> Activate
              </Btn>
            )}
            {tenant.slug !== 'default' && (
              <Btn variant="ghost" size="sm" onClick={() => onDeprovision(tenant)}
                className="text-red-500 hover:bg-red-50">
                <Trash2 size={12} /> Delete
              </Btn>
            )}
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-2 px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Mail size={9} /> Contact
          </p>
          <p className="text-xs text-gray-700 truncate">{tenant.contact_email || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Database size={9} /> Schema
          </p>
          <p className="text-xs text-gray-700 font-mono">{tenant.schema_name}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Calendar size={9} /> Created
          </p>
          <p className="text-xs text-gray-700">
            {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Hash size={9} /> Tenant ID
          </p>
          <p className="text-[10px] text-gray-500 font-mono truncate">{tenant.tenant_id}</p>
        </div>
      </div>

      {/* SSO domains + resend invite side by side */}
      {!isDeprovisioned && (
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="px-4 py-3">
            <DomainManager tenant={tenant} compact />
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Resend invite
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={reinviteEmail}
                onChange={e => { setReinviteEmail(e.target.value); setReinviteMsg(''); }}
                placeholder="admin@tenant.com"
                className="flex-1 h-7 border border-gray-200 rounded-lg px-2 text-xs focus:outline-none focus:border-indigo-400"
              />
              <Btn variant="secondary" size="sm" onClick={sendReinvite} disabled={reinviting || !reinviteEmail.trim()}>
                {reinviting ? <Spinner size={3} /> : <Mail size={11} />}
                {reinviting ? 'Sending…' : 'Send'}
              </Btn>
            </div>
            {reinviteMsg === 'ok' && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle size={10} /> Sent.
              </p>
            )}
            {recoveryLink && (
              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[10px] font-semibold text-amber-800 mb-1">
                  User exists — share this one-time link:
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={recoveryLink}
                    className="flex-1 h-6 border border-amber-300 rounded px-1.5 text-[10px] font-mono bg-white text-gray-700 select-all"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(recoveryLink)}
                    className="shrink-0 px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-medium rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-amber-600 mt-0.5">Expires in 1 hour · single-use</p>
              </div>
            )}
            {reinviteMsg && reinviteMsg !== 'ok' && !recoveryLink && (
              <p className="text-xs text-red-500 mt-1">{reinviteMsg}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Domain manager ─────────────────────────────────────────────────────────────

function DomainManager({ tenant, compact }) {
  const [domains,     setDomains]     = useState([]);
  const [newDomain,   setNewDomain]   = useState('');
  const [defaultRole, setDefaultRole] = useState('ANALYST');
  const [adding,      setAdding]      = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    api.admin.tenants.domains.list(tenant.slug)
      .then(d => setDomains(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [tenant.slug]);

  const add = async (e) => {
    e.preventDefault();
    const d = newDomain.trim().toLowerCase().replace(/^@/, '');
    if (!d) return;
    setAdding(true); setError('');
    try {
      await api.admin.tenants.domains.add(tenant.slug, { domain: d, default_role: defaultRole });
      setDomains(prev => [...prev, { domain: d, tenant_schema: tenant.schema_name, default_role: defaultRole }]);
      setNewDomain('');
    } catch (err) { setError(err.message || 'Failed to add domain'); }
    finally { setAdding(false); }
  };

  const remove = async (domain) => {
    try {
      await api.admin.tenants.domains.remove(tenant.slug, domain);
      setDomains(prev => prev.filter(d => d.domain !== domain));
    } catch (_) {}
  };

  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        SSO Domains
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {domains.length === 0
          ? <span className="text-xs text-gray-400">No domains registered</span>
          : domains.map(d => (
            <span key={d.domain}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-700">
              @{d.domain}
              <span className="text-indigo-400">·</span>
              <span className="text-indigo-500">{d.default_role}</span>
              <button onClick={() => remove(d.domain)}
                className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors">
                ×
              </button>
            </span>
          ))
        }
      </div>
      <form onSubmit={add} className="flex items-center gap-1.5">
        <input
          type="text" placeholder="acme.com"
          value={newDomain} onChange={e => setNewDomain(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-28"
        />
        <select value={defaultRole} onChange={e => setDefaultRole(e.target.value)}
          className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="ANALYST">Analyst</option>
          <option value="DOMAIN_OWNER">Domain Owner</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit" disabled={adding || !newDomain.trim()}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
          <Plus size={10} /> Add
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
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
          <p className="text-xs text-amber-600 mt-1">
            An invite email will be sent to the admin so they can set their own Supabase login password.
            The temporary password above is only used if Supabase auth is disabled.
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
  const [tenants,       setTenants]       = useState([]);
  const [selectedSlug,  setSelectedSlug]  = useState('');
  const [loading,       setLoading]       = useState(true);
  const [showProvision, setShowProvision] = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = safeArray(await api.admin.tenants.list());
      setTenants(list);
      // Keep selection valid after reload; default to first tenant if none selected
      setSelectedSlug(prev => {
        if (prev && list.some(t => t.slug === prev)) return prev;
        return list[0]?.slug ?? '';
      });
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
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

  const active        = tenants.filter(t => t.status === 'ACTIVE');
  const suspended     = tenants.filter(t => t.status === 'SUSPENDED');
  const deprovisioned = tenants.filter(t => t.status === 'DEPROVISIONED');
  const selectedTenant = tenants.find(t => t.slug === selectedSlug) ?? null;

  return (
    <div className="flex-1 overflow-auto p-5 bg-transparent">
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Active tenants', value: active.length,        color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
          { label: 'Suspended',      value: suspended.length,     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
          { label: 'Deprovisioned',  value: deprovisioned.length, color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
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
        <>
          {/* Tenant selector */}
          <div className="mb-3">
            <div className="relative max-w-sm">
              <select
                value={selectedSlug}
                onChange={e => setSelectedSlug(e.target.value)}
                className="w-full h-9 pl-9 pr-8 border border-gray-200 rounded-xl text-sm bg-white shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              >
                {tenants.map(t => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} ({t.slug}) — {t.status}
                  </option>
                ))}
              </select>
              <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Detail panel */}
          {selectedTenant && (
            <TenantDetail
              key={selectedTenant.slug}
              tenant={selectedTenant}
              onSuspend={suspend}
              onActivate={activate}
              onDeprovision={deprovision}
              onEdit={t => setEditTarget(t)}
            />
          )}
        </>
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
