import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Btn, EmptyState, Modal, Input, Select, Spinner } from '../components/Card.jsx';
import { FileText, Upload, Trash2, RefreshCw, Tag, AlertCircle } from 'lucide-react';

const STATUS_COLOR = { INDEXED: 'green', INDEXING: 'blue', UPLOADED: 'yellow', FAILED: 'red' };

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function Memory() {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({ title: '', tags: '', domainKey: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    api.domains.list().then(ds => {
      setDomains(ds ?? []);
      if (ds?.length) {
        const key = ds[0].domain_key ?? ds[0].domainKey;
        setSelectedDomain(key);
        setForm(f => ({ ...f, domainKey: key }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDomain) return;
    setLoading(true);
    api.memory.list(selectedDomain).then(setDocs).catch(() => setDocs([])).finally(() => setLoading(false));
  }, [selectedDomain]);

  const refresh = () => {
    if (!selectedDomain) return;
    setLoading(true);
    api.memory.list(selectedDomain).then(setDocs).catch(() => setDocs([])).finally(() => setLoading(false));
  };

  const upload = async () => {
    if (!file || !form.domainKey || !form.title) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('domainKey', form.domainKey);
      fd.append('title', form.title);
      fd.append('tags', form.tags);
      await api.memory.upload(fd);
      setShowUpload(false);
      setFile(null);
      setForm(f => ({ ...f, title: '', tags: '' }));
      if (form.domainKey === selectedDomain) refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const archive = async (key) => {
    if (!confirm('Archive this document?')) return;
    await api.memory.archive(key).catch(() => {});
    refresh();
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <PageHeader
        title="Knowledge Memory"
        subtitle="Upload and manage documents for RAG retrieval"
        actions={
          <>
            <Select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
            >
              {domains.map(d => { const k = d.domain_key ?? d.domainKey; return <option key={k} value={k}>{d.name}</option>; })}
            </Select>
            <Btn onClick={refresh} variant="secondary" size="sm"><RefreshCw size={13} /></Btn>
            <Btn onClick={() => setShowUpload(true)} size="sm"><Upload size={13} /> Upload</Btn>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" body="Upload documents to build the knowledge base for this domain." />
      ) : (
        <div className="grid gap-3">
          {docs.map(doc => (
            <Card key={doc.document_key} className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                  <Badge label={doc.status} color={STATUS_COLOR[doc.status] ?? 'gray'} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {doc.file_name} · {formatBytes(doc.file_size_bytes ?? 0)}
                </p>
                {doc.tags && (
                  <div className="flex items-center gap-1 mt-1">
                    <Tag size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{doc.tags}</span>
                  </div>
                )}
                {doc.status === 'INDEXED' && (
                  <p className="text-xs text-green-600 mt-0.5">{doc.chunk_count} chunks indexed</p>
                )}
                {doc.status === 'FAILED' && (
                  <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle size={11} /> Indexing failed
                  </p>
                )}
              </div>
              <Btn variant="ghost" size="sm" onClick={() => archive(doc.document_key)}>
                <Trash2 size={13} />
              </Btn>
            </Card>
          ))}
        </div>
      )}

      {/* Upload modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        <div className="space-y-4">
          <Select label="Domain" value={form.domainKey} onChange={e => setForm(f => ({ ...f, domainKey: e.target.value }))}>
            {domains.map(d => { const k = d.domain_key ?? d.domainKey; return <option key={k} value={k}>{d.name}</option>; })}
          </Select>
          <Input label="Title" placeholder="Document title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Tags (comma-separated)" placeholder="invoicing, policy, 2024"
            value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{file ? file.name : 'Click to select file'}</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD, HTML · max 50 MB</p>
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.docx,.txt,.md,.html"
            onChange={e => setFile(e.target.files[0] ?? null)} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Btn>
            <Btn onClick={upload} disabled={uploading || !file || !form.title || !form.domainKey}>
              {uploading ? <Spinner size={4} /> : <Upload size={13} />} Upload
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
