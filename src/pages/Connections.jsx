import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import {
  PageContainer, PageHeader, Card, Button, IconButton, Badge, statusKind, Chip,
  Dialog, Field, Input, Select, InlineAlert, EmptyState, Skeleton, Spinner,
} from '../ds';
import { Database, Plus, Pencil, Trash2, TestTube } from 'lucide-react';

const CONN_TYPES = ['ORACLE', 'POSTGRES', 'REST_API'];

const JDBC_PLACEHOLDER = {
  POSTGRES: 'jdbc:postgresql://localhost:5432/mydb',
  ORACLE:   'jdbc:oracle:thin:@localhost:1521:ORCL',
  REST_API: 'https://api.example.com/v1',
};

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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditingKey(null);
    setForm(EMPTY_FORM);
    setError('');
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
    <PageContainer className="py-8">
      <PageHeader
        className="mb-8"
        title="Data Connections"
        summary="Manage approved enterprise data source connections"
        actions={<Button onClick={openAdd}><Plus size={14} /> Add Connection</Button>}
      />

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading connections">
          <Skeleton className="h-[86px]" />
          <Skeleton className="h-[86px]" />
          <Skeleton className="h-[86px]" />
        </div>
      ) : conns.length === 0 ? (
        <EmptyState
          title="No connections yet"
          hint="Add a database connection to enable live data queries across your enterprise."
        />
      ) : (
        <div className="grid gap-z-gutter">
          {conns.map(conn => (
            <div key={conn.connection_key}>
              <Card>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-z-md bg-z-primary-soft">
                    <Database size={18} className="text-z-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-z-body font-medium text-z-text">{conn.name}</p>
                      <Chip>{conn.connection_type}</Chip>
                      <Badge status={statusKind(conn.status)} dot live={testingKey === conn.connection_key}>
                        {conn.status ?? 'UNKNOWN'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-z-caption text-z-text-3">{conn.jdbc_url}</p>
                    {conn.last_tested_at && (
                      <p className="mt-0.5 text-z-caption text-z-text-3">
                        Last tested: {new Date(conn.last_tested_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => testConn(conn.connection_key)} disabled={testingKey === conn.connection_key}>
                      {testingKey === conn.connection_key ? <Spinner size="xs" /> : <TestTube size={13} />}
                      Test
                    </Button>
                    <IconButton label={`Edit ${conn.name}`} onClick={() => openEdit(conn)}><Pencil size={15} /></IconButton>
                    <IconButton label={`Delete ${conn.name}`} onClick={() => deleteConn(conn.connection_key)}><Trash2 size={15} /></IconButton>
                  </div>
                </div>
              </Card>
              {testErrors[conn.connection_key] && (
                <InlineAlert variant="error" title="Connection test failed" className="mt-2">
                  {testErrors[conn.connection_key]}
                </InlineAlert>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={showModal}
        onClose={closeModal}
        title={editingKey ? 'Edit Connection' : 'Add Connection'}
        description="Approved enterprise data source connection"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.connectionKey || !form.name || !form.jdbcUrl}>
              {saving ? <Spinner size="xs" /> : editingKey ? <Pencil size={13} /> : <Plus size={13} />}
              {editingKey ? 'Save Changes' : 'Add Connection'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Connection Key (unique ID)">
            <Input placeholder="ods-postgres" value={form.connectionKey}
              onChange={e => set('connectionKey', e.target.value)} disabled={!!editingKey} />
          </Field>
          <Field label="Display Name">
            <Input placeholder="ODS Oracle Production" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={form.connectionType} onChange={e => set('connectionType', e.target.value)}>
              {CONN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label={form.connectionType === 'REST_API' ? 'Base URL' : 'JDBC URL'}>
            <Input placeholder={JDBC_PLACEHOLDER[form.connectionType] ?? ''} value={form.jdbcUrl}
              onChange={e => set('jdbcUrl', e.target.value)} />
          </Field>
          <Field label="Database Schema">
            <Input placeholder="public" value={form.allowedSchemas} onChange={e => set('allowedSchemas', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username">
              <Input value={form.username} onChange={e => set('username', e.target.value)} />
            </Field>
            <Field label={editingKey ? 'Password (blank = keep)' : 'Password'}>
              <Input type="password" reveal value={form.secret}
                onChange={e => set('secret', e.target.value)}
                placeholder={editingKey ? '(unchanged)' : '••••••••'} />
            </Field>
          </div>
          <Field label="Domain Keys (comma-separated)">
            <Input placeholder="invoicing,procurement" value={form.domainKeys} onChange={e => set('domainKeys', e.target.value)} />
          </Field>

          {error && <InlineAlert variant="error">{error}</InlineAlert>}
        </div>
      </Dialog>
    </PageContainer>
  );
}
