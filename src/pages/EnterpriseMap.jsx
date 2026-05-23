import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Textarea, Spinner } from '../components/Card.jsx';
import { Network, Plus, ChevronDown, ChevronRight, ScanLine, FileText, Trash2, Shield, EyeOff, Filter } from 'lucide-react';

function scanStatusColor(s) {
  return { SCANNED: 'green', SCANNING: 'blue', PENDING: 'yellow', FAILED: 'red' }[s] ?? 'gray';
}

function DataPoliciesPanel({ objectKey }) {
  const [colPolicies, setColPolicies] = useState([]);
  const [rlsPolicies, setRlsPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.governance.columnPolicies.list().catch(() => []),
      api.governance.rlsPolicies.list().catch(() => []),
    ]).then(([cols, rls]) => {
      setColPolicies(safeArray(cols).filter(p => p.objectKey === objectKey));
      setRlsPolicies(safeArray(rls).filter(p => p.objectKey === objectKey));
    }).finally(() => setLoading(false));
  }, [objectKey]);

  const maskColor = t => t === 'EXCLUDE' ? 'bg-red-50 text-red-700' : t === 'HASH' ? 'bg-blue-50 text-blue-700' : t === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600';

  if (loading) return <div className="py-4 text-center text-xs text-gray-400">Loading policies…</div>;

  const noPolicies = colPolicies.length === 0 && rlsPolicies.length === 0;
  if (noPolicies) {
    return (
      <div className="py-4 text-center text-xs text-gray-400">
        No governance policies on this object.{' '}
        <a href="#/governance" className="text-indigo-600 hover:underline">Add one in the Governance Hub →</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column masking policies */}
      {colPolicies.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <EyeOff size={11} /> Column Masking ({colPolicies.length})
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left pb-1 font-medium">Column</th>
                <th className="text-left pb-1 font-medium">Mask type</th>
                <th className="text-left pb-1 font-medium">Exempt roles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {colPolicies.map(p => (
                <tr key={p.policyKey} className="hover:bg-gray-50">
                  <td className="py-1 font-mono font-semibold text-gray-800">{p.columnName}</td>
                  <td className="py-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${maskColor(p.maskType)}`}>
                      {p.maskType === 'EXCLUDE' && <EyeOff size={9} />}
                      {p.maskType}
                    </span>
                  </td>
                  <td className="py-1 text-gray-500">{p.exemptRoles?.length > 0 ? p.exemptRoles.join(', ') : 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RLS policies */}
      {rlsPolicies.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <Filter size={11} /> Row Filters ({rlsPolicies.length})
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left pb-1 font-medium">Policy</th>
                <th className="text-left pb-1 font-medium">Filter</th>
                <th className="text-left pb-1 font-medium">Applies to</th>
                <th className="text-left pb-1 font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rlsPolicies.map(p => (
                <tr key={p.policyKey} className="hover:bg-gray-50">
                  <td className="py-1 font-semibold text-gray-800">{p.policyName}</td>
                  <td className="py-1 font-mono text-violet-700 max-w-[200px] truncate">{p.filterTemplate}</td>
                  <td className="py-1 text-gray-500">{p.appliesToRoles?.length > 0 ? p.appliesToRoles.join(', ') : 'All roles'}</td>
                  <td className="py-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.isActive ? 'Active' : 'Off'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ObjectRow({ obj, onScan, onDelete }) {
  const [expanded,    setExpanded]    = useState(false);
  const [innerTab,    setInnerTab]    = useState('columns'); // 'columns' | 'policies'
  const [columns,     setColumns]     = useState(null);
  const [loadingCols, setLoadingCols] = useState(false);

  const loadCols = useCallback(async () => {
    if (columns !== null) { setExpanded(e => !e); return; }
    setLoadingCols(true);
    try {
      const cols = await api.enterprise.columns(obj.object_key);
      setColumns(safeArray(cols));
      setExpanded(true);
    } catch { setColumns([]); setExpanded(true); }
    finally { setLoadingCols(false); }
  }, [columns, obj.object_key]);

  const qualifiedName = [obj.schema_name, obj.table_name].filter(Boolean).join('.');

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <button onClick={loadCols} className="text-gray-400 hover:text-gray-600">
          {loadingCols ? <Spinner size={3} /> : expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800 font-mono">{qualifiedName}</span>
            {obj.business_name && obj.business_name !== obj.table_name && (
              <span className="text-xs text-gray-500">({obj.business_name})</span>
            )}
            <Badge label={obj.scan_status ?? 'PENDING'} color={scanStatusColor(obj.scan_status)} />
            <Badge label={obj.connection_key ?? '—'} color="navy" />
          </div>
          {obj.purpose && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{obj.purpose}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn variant="secondary" size="sm" onClick={() => onScan(obj.object_key)}>
            <ScanLine size={12} /> Scan
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => onDelete(obj.object_key)}>
            <Trash2 size={12} />
          </Btn>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-6 border-t border-gray-100 pt-3">
          {/* Inner tab bar */}
          <div className="flex gap-3 mb-3">
            {[['columns', 'Columns'], ['policies', 'Data Policies']].map(([k, label]) => (
              <button key={k} onClick={() => setInnerTab(k)}
                className={`flex items-center gap-1.5 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
                  innerTab === k
                    ? 'border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {k === 'policies' && <Shield size={11} />}
                {label}
              </button>
            ))}
          </div>

          {innerTab === 'columns' && columns !== null && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-1 font-medium">Column</th>
                  <th className="text-left pb-1 font-medium">Type</th>
                  <th className="text-left pb-1 font-medium">Business meaning</th>
                  <th className="text-left pb-1 font-medium">Roles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {columns.map(col => {
                  const roles = [
                    col.is_identifier && 'identifier',
                    col.is_status     && 'status',
                    col.is_error      && 'error',
                    col.is_sensitive  && 'sensitive',
                    col.is_filterable && 'filterable',
                  ].filter(Boolean);
                  return (
                    <tr key={col.column_name} className="hover:bg-gray-50">
                      <td className="py-1 font-mono">{col.column_name}</td>
                      <td className="py-1 text-gray-500">{col.data_type}</td>
                      <td className="py-1 text-gray-600">{col.business_meaning || '—'}</td>
                      <td className="py-1 text-gray-500">{roles.join(', ') || '—'}</td>
                    </tr>
                  );
                })}
                {columns.length === 0 && (
                  <tr><td colSpan={4} className="py-2 text-gray-400 text-center">No columns scanned yet</td></tr>
                )}
              </tbody>
            </table>
          )}

          {innerTab === 'policies' && (
            <DataPoliciesPanel objectKey={obj.object_key} />
          )}
        </div>
      )}
    </Card>
  );
}

function safeArray(v) { return Array.isArray(v) ? v : []; }

export default function EnterpriseMap() {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [objects, setObjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('objects');
  const [showAddObject, setShowAddObject] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [objForm, setObjForm] = useState({
    connectionKey: '', schemaName: '', tableName: '', businessName: '',
    purpose: '', domainKey: '',
  });

  // Load domains on mount
  useEffect(() => {
    api.domains.list()
      .then(ds => {
        const arr = safeArray(ds);
        setDomains(arr);
        if (arr.length) {
          const first = arr[0].domain_key ?? arr[0].domainKey;
          setSelectedDomain(first);
          setObjForm(f => ({ ...f, domainKey: first }));
        }
      })
      .catch(() => {});
  }, []);

  // Load objects + notes when domain changes
  useEffect(() => {
    if (!selectedDomain) return;
    setLoading(true);
    Promise.all([
      api.enterprise.objects(selectedDomain).catch(() => []),
      api.enterprise.notes(selectedDomain).catch(() => []),
    ]).then(([obs, nts]) => {
      setObjects(safeArray(obs));
      setNotes(safeArray(nts));
    }).finally(() => setLoading(false));
  }, [selectedDomain]);

  const reload = () => {
    if (!selectedDomain) return;
    setLoading(true);
    Promise.all([
      api.enterprise.objects(selectedDomain).catch(() => []),
      api.enterprise.notes(selectedDomain).catch(() => []),
    ]).then(([obs, nts]) => {
      setObjects(safeArray(obs));
      setNotes(safeArray(nts));
    }).finally(() => setLoading(false));
  };

  const scan = async (key) => {
    try {
      await api.enterprise.scan(key);
      setTimeout(reload, 1500); // give scan a moment
    } catch (e) { alert(e.message); }
  };

  const deleteObj = async (key) => {
    if (!confirm('Remove this data object?')) return;
    await api.enterprise.deleteObject(key).catch(e => alert(e.message));
    reload();
  };

  const saveObject = async () => {
    setSaving(true); setError('');
    try {
      await api.enterprise.createObject({
        ...objForm,
        domain_key: objForm.domainKey,
        connection_key: objForm.connectionKey,
        schema_name: objForm.schemaName,
        table_name: objForm.tableName,
        business_name: objForm.businessName,
      });
      reload();
      setShowAddObject(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 overflow-auto p-7 bg-transparent">
      <PageHeader
        title="Enterprise Map"
        subtitle="Approved data objects, columns, and operational notes"
        actions={
          <>
            <Select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
            >
              {domains.map(d => {
                const key = d.domain_key ?? d.domainKey;
                return <option key={key} value={key}>{d.name}</option>;
              })}
            </Select>
            <Btn size="sm" onClick={() => setShowAddObject(true)}>
              <Plus size={13} /> Add Object
            </Btn>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['objects', `Data Objects (${objects.length})`], ['notes', `Notes (${notes.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${tab === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : tab === 'objects' ? (
        objects.length === 0 ? (
          <EmptyState icon={Network} title="No data objects"
            body="Add approved tables or views to enable governed SQL execution." />
        ) : (
          <div className="space-y-2">
            {objects.map(obj => (
              <ObjectRow key={obj.object_key} obj={obj} onScan={scan} onDelete={deleteObj} />
            ))}
          </div>
        )
      ) : (
        notes.length === 0 ? (
          <EmptyState icon={FileText} title="No operational notes"
            body="Add notes about data quirks, business rules, or known issues." />
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <Card key={n.note_key} className="p-4">
                <p className="text-sm text-gray-700">{n.note_text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.created_by} · {n.created_at?.split('T')[0]}
                </p>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Add object modal */}
      <Modal open={showAddObject} onClose={() => { setShowAddObject(false); setError(''); }} title="Add Data Object">
        <div className="space-y-3">
          <Select label="Domain" value={objForm.domainKey}
            onChange={e => setObjForm(f => ({ ...f, domainKey: e.target.value }))}>
            {domains.map(d => {
              const key = d.domain_key ?? d.domainKey;
              return <option key={key} value={key}>{d.name}</option>;
            })}
          </Select>
          <Input label="Connection Key" placeholder="local-postgres" value={objForm.connectionKey}
            onChange={e => setObjForm(f => ({ ...f, connectionKey: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Schema" placeholder="public" value={objForm.schemaName}
              onChange={e => setObjForm(f => ({ ...f, schemaName: e.target.value }))} />
            <Input label="Table Name" placeholder="lgs_supplier" value={objForm.tableName}
              onChange={e => setObjForm(f => ({ ...f, tableName: e.target.value }))} />
          </div>
          <Input label="Business Name" placeholder="Suppliers" value={objForm.businessName}
            onChange={e => setObjForm(f => ({ ...f, businessName: e.target.value }))} />
          <Textarea label="Purpose / Description" rows={2} value={objForm.purpose}
            onChange={e => setObjForm(f => ({ ...f, purpose: e.target.value }))} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowAddObject(false)}>Cancel</Btn>
            <Btn onClick={saveObject}
              disabled={saving || !objForm.connectionKey || !objForm.tableName}>
              {saving ? <Spinner size={4} /> : <Plus size={13} />} Add & Scan
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
