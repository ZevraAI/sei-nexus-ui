import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Spinner } from '../components/Card.jsx';
import { Database, Plus, Pencil, Trash2, CheckCircle, XCircle, RefreshCw, TestTube, Eye, EyeOff } from 'lucide-react';

const CONN_TYPES = ['ORACLE', 'POSTGRES', 'REST_API'];

const JDBC_PLACEHOLDER = {
  POSTGRES: 'jdbc:postgresql://localhost:5432/mydb',
  ORACLE:   'jdbc:oracle:thin:@localhost:1521:ORCL',
  REST_API: 'https://api.example.com/v1',
};

const STATUS_COLOR = { ACTIVE: 'green', FAILED: 'red', TESTING: 'blue', PENDING: 'yellow' };

const EMPTY_FORM = { connectionKey: '', name: '', connectionType: 'POSTGRES', jdbcUrl: '', allowedSchemas: 'public', username: '', secret: '', domainKeys: '' };

export default function Connections() {
  const [conns, setConns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState(null);
  const [error, setError] = useState('');
  const [testErrors, setTestErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditingKey(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (conn) => {
    setEditingKey(conn.connection_key);
    setForm({
      connectionKey:  conn.connection_key,
      name:           conn.name,
      connectionType: conn.connection_type,
      jdbcUrl:        conn.jdbc_url ?? '',
      allowedSchemas: conn.allowed_schemas ?? 'public',
      username:       conn.username ?? '',
      secret:         '',
      domainKeys:     '',
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setError(''); };

  useEffect(() => {
    api.connections.list().then(setConns).catch(() => setConns([])).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.connections.create(form);
      const updated = await api.connections.list();
      setConns(updated);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const testConn = async (key) => {
    setTestingKey(key);
    setTestErrors(e => ({ ...e, [key]: null }));
    try {
      const result = await api.connections.test(key);
      const msg = result?.message || result?.error;
      if (result && (result.success === false || result.status === 'FAILED')) {
        throw new Error(msg || 'Connection test failed');
      }
      setConns(cs => cs.map(c => c.connection_key === key ? { ...c, status: 'ACTIVE', last_tested_at: new Date().toISOString() } : c));
    } catch (err) {
      setConns(cs => cs.map(c => c.connection_key === key ? { ...c, status: 'FAILED' } : c));
      setTestErrors(e => ({ ...e, [key]: err.message || 'Connection test failed' }));
    } finally {
      setTestingKey(null);
    }
  };

  const deleteConn = async (key) => {
    if (!confirm('Delete this connection?')) return;
    await api.connections.delete(key).catch(() => {});
    setConns(cs => cs.filter(c => c.connection_key !== key));
  };

  return (
    <div className="flex-1 overflow-auto p-7 bg-transparent">
      <PageHeader
        title="Data Connections"
        subtitle="Manage approved enterprise data source connections"
        actions={<Btn onClick={openAdd}><Plus size={13} /> Add Connection</Btn>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : conns.length === 0 ? (
        <EmptyState icon={Database} title="No connections" body="Add a database connection to enable live data queries." />
      ) : (
        <div className="grid gap-3">
          {conns.map(conn => (
            <div key={conn.connection_key}>
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Database size={18} className="text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{conn.name}</p>
                    <Badge label={conn.connection_type} color="navy" />
                    <Badge label={conn.status ?? 'UNKNOWN'} color={STATUS_COLOR[conn.status] ?? 'gray'} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{conn.jdbc_url}</p>
                  {conn.last_tested_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last tested: {new Date(conn.last_tested_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Btn variant="secondary" size="sm" onClick={() => testConn(conn.connection_key)} disabled={testingKey === conn.connection_key}>
                    {testingKey === conn.connection_key ? <Spinner size={3} /> : <TestTube size={13} />}
                    Test
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(conn)}>
                    <Pencil size={13} />
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => deleteConn(conn.connection_key)}>
                    <Trash2 size={13} />
                  </Btn>
                </div>
              </div>
            </Card>
            {testErrors[conn.connection_key] && (
              <div className="mt-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{testErrors[conn.connection_key]}</p>
              </div>
            )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editingKey ? 'Edit Connection' : 'Add Connection'}>
        <div className="space-y-4">
          <Input label="Connection Key (unique ID)" placeholder="ods-postgres" value={form.connectionKey}
            onChange={e => set('connectionKey', e.target.value)} disabled={!!editingKey} />
          <Input label="Display Name" placeholder="ODS Oracle Production" value={form.name}
            onChange={e => set('name', e.target.value)} />
          <Select label="Type" value={form.connectionType} onChange={e => set('connectionType', e.target.value)}>
            {CONN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input
            label={form.connectionType === 'REST_API' ? 'Base URL' : 'JDBC URL'}
            placeholder={JDBC_PLACEHOLDER[form.connectionType] ?? ''}
            value={form.jdbcUrl}
            onChange={e => set('jdbcUrl', e.target.value)}
          />
          <Input
            label="Database Schema"
            placeholder="public"
            value={form.allowedSchemas}
            onChange={e => set('allowedSchemas', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Username" value={form.username} onChange={e => set('username', e.target.value)} />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {editingKey ? 'Password (leave blank to keep existing)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.secret}
                  onChange={e => set('secret', e.target.value)}
                  placeholder={editingKey ? '(unchanged)' : '••••••••'}
                  className="w-full h-9 border border-gray-300 rounded-lg px-3 pr-9 text-sm focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <Input label="Domain Keys (comma-separated)" placeholder="invoicing,procurement"
            value={form.domainKeys} onChange={e => set('domainKeys', e.target.value)} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.connectionKey || !form.name || !form.jdbcUrl}>
              {saving ? <Spinner size={4} /> : editingKey ? <Pencil size={13} /> : <Plus size={13} />}
              {editingKey ? 'Save Changes' : 'Add Connection'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
