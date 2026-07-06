import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { UserPlus, MoreHorizontal, Shield, Mail } from 'lucide-react';
import { Spinner } from '../components/Card.jsx';

const ROLE_STYLES = {
  ADMIN:        'bg-purple-100 text-purple-700 border-purple-200',
  DOMAIN_OWNER: 'bg-blue-100   text-blue-700   border-blue-200',
  ANALYST:      'bg-gray-100   text-gray-600   border-gray-200',
};

const STATUS_STYLES = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-red-100     text-red-600',
  INVITED:  'bg-amber-100   text-amber-700',
};

const ROLE_LABELS = {
  ADMIN:        'Admin — full system access',
  DOMAIN_OWNER: 'Domain Owner — manage domain data',
  ANALYST:      'Analyst — read & query access',
};

function InviteModal({ onClose, onInvited, isPlatformAdmin, currentTenantSchema }) {
  const [form,    setForm]    = useState({
    email: '', role: 'ANALYST', display_name: '',
    tenant_schema: currentTenantSchema || '',
  });
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (isPlatformAdmin) {
      api.admin.tenants.list()
        .then(data => setTenants(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isPlatformAdmin]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.users.invite(form);
      onInvited();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Mail size={16} className="text-emerald-700" />
          </div>
          <h2 className="text-[17px] font-bold text-gray-900">Invite Team Member</h2>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Email Address *
            </label>
            <input type="email" required
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="colleague@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Display Name
            </label>
            <input type="text"
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="Jane Smith"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            />
          </div>

          {/* Workspace — dropdown for platform admin, read-only badge for regular admin */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Workspace
            </label>
            {isPlatformAdmin ? (
              <select required
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                value={form.tenant_schema}
                onChange={e => setForm(f => ({ ...f, tenant_schema: e.target.value }))}
              >
                <option value="">— select workspace —</option>
                {tenants.map(t => (
                  <option key={t.schema_name || t.schemaName} value={t.schema_name || t.schemaName}>
                    {t.name} ({t.schema_name || t.schemaName})
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3.5 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-500 font-mono">
                {currentTenantSchema}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Role
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-3.5 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Spinner size={4} />}
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserActionMenu({ user, currentEmail, onRoleChange, onDeactivate, onReactivate, onResendInvite, onClose }) {
  const otherRoles = Object.keys(ROLE_LABELS).filter(r => r !== user.role);
  const isSelf     = user.email === currentEmail;
  return (
    <div className="absolute right-0 top-8 w-52 rounded-xl shadow-xl border border-gray-200 bg-white z-20 py-1 overflow-hidden">
      {/* Role changes — only for active/invited users who aren't self */}
      {user.status !== 'INACTIVE' && !isSelf && otherRoles.map(r => (
        <button key={r} onClick={() => { onRoleChange(user.email, r); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
          <Shield size={12} className="text-gray-400" />
          Make {r.toLowerCase().replace('_', ' ')}
        </button>
      ))}

      {/* Resend invite — only for INVITED users */}
      {user.status === 'INVITED' && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onResendInvite(user.email); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-amber-600 hover:bg-amber-50 transition-colors">
            Resend Invite
          </button>
        </>
      )}

      {/* Deactivate — active/invited non-self */}
      {user.status !== 'INACTIVE' && !isSelf && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onDeactivate(user.email); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
            Deactivate
          </button>
        </>
      )}

      {/* Reactivate — inactive users only */}
      {user.status === 'INACTIVE' && (
        <button onClick={() => { onReactivate(user.email); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-emerald-600 hover:bg-emerald-50 transition-colors">
          Reactivate
        </button>
      )}
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme();

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [openMenu,   setOpenMenu]   = useState(null);

  const isAdmin         = currentUser?.role === 'ADMIN';
  const isPlatformAdmin = isAdmin && (!currentUser?.tenant_schema || currentUser?.tenant_schema === 'public');

  const load = async () => {
    try {
      const data = await api.users.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (email, role) => {
    try {
      await api.users.update(email, { role });
      setUsers(us => us.map(u => u.email === email ? { ...u, role } : u));
    } catch (_) {}
  };

  const deactivate = async (email) => {
    if (!confirm(`Deactivate ${email}? They will lose access immediately.`)) return;
    try {
      await api.users.remove(email);
      setUsers(us => us.map(u => u.email === email ? { ...u, status: 'INACTIVE' } : u));
    } catch (_) {}
  };

  const reactivate = async (email) => {
    try {
      await api.users.reactivate(email);
      setUsers(us => us.map(u => u.email === email ? { ...u, status: 'ACTIVE' } : u));
    } catch (_) {}
  };

  const resendInvite = async (email) => {
    try {
      await api.users.resendInvite(email);
      alert(`Invite resent to ${email}`);
    } catch (err) {
      alert(err.message || 'Failed to resend invite');
    }
  };

  const base = isDark
    ? 'bg-[#111827] text-[#F0F4F8] border-[#1E293B]'
    : 'bg-white text-gray-900 border-gray-200';

  const sub = isDark ? 'text-[#64748B]' : 'text-gray-400';
  const rowHover = isDark ? 'hover:bg-[#1A2333]' : 'hover:bg-gray-50';
  const border = isDark ? 'border-[#1E293B]' : 'border-gray-100';

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-[22px] font-bold ${isDark ? 'text-[#F0F4F8]' : 'text-gray-900'}`}>
              Team Members
            </h1>
            <p className={`text-[13px] mt-1 ${sub}`}>
              Manage who has access to your workspace
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
            >
              <UserPlus size={14} />
              Invite
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className={`text-center py-16 text-[13px] ${sub}`}>No team members found.</div>
        ) : (
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-[#1E293B]' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead>
                <tr className={isDark ? 'bg-[#1A2333]' : 'bg-gray-50'}>
                  {['Member', 'Workspace', 'Role', 'Status', 'Joined', ...(isAdmin ? [''] : [])].map((h, i) => (
                    <th key={i} className={`px-5 py-3.5 text-left text-[10.5px] font-semibold uppercase tracking-wide ${sub}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.email}
                    className={`border-t transition-colors ${border} ${rowHover}`}
                    onClick={() => setOpenMenu(null)}>
                    {/* Member */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                          {(u.display_name || u.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-[13px] font-medium ${isDark ? 'text-[#F0F4F8]' : 'text-gray-900'}`}>
                            {u.display_name || u.email}
                          </p>
                          {u.display_name && (
                            <p className={`text-[11px] ${sub}`}>{u.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Workspace */}
                    <td className={`px-5 py-4 text-[12px] font-mono ${sub}`}>
                      {u.tenant_schema || '—'}
                    </td>
                    {/* Role */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {u.role}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[u.status] || ''}`}>
                        {u.status}
                      </span>
                    </td>
                    {/* Joined */}
                    <td className={`px-5 py-4 text-[12px] ${sub}`}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    {/* Actions */}
                    {isAdmin && (
                      <td className="px-5 py-4">
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenMenu(openMenu === u.email ? null : u.email)}
                            disabled={u.email === currentUser?.email}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-[#252E3F] text-[#64748B]' : 'hover:bg-gray-100 text-gray-400'}`}
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {openMenu === u.email && (
                            <UserActionMenu
                              user={u}
                              currentEmail={currentUser?.email}
                              onRoleChange={changeRole}
                              onDeactivate={deactivate}
                              onReactivate={reactivate}
                              onResendInvite={resendInvite}
                              onClose={() => setOpenMenu(null)}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={load}
          isPlatformAdmin={isPlatformAdmin}
          currentTenantSchema={currentUser?.tenant_schema}
        />
      )}
    </div>
  );
}
