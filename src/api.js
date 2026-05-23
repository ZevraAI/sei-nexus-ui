// ─── Zevra API client ────────────────────────────────────────────────────
// All requests include session cookie automatically (credentials: 'include').
// On 401 the client clears local auth state and redirects to /login.

const BASE = import.meta.env.VITE_API_BASE ?? '';
const TOKEN_KEY = 'nexus_token';
const USER_KEY = 'nexus_user';

function authToken() {
  const direct = localStorage.getItem(TOKEN_KEY);
  if (direct) return direct;
  try {
    const stored = JSON.parse(localStorage.getItem(USER_KEY));
    return stored?.token || stored?.authToken || null;
  } catch (_) {
    return null;
  }
}

async function req(method, path, body, isForm = false) {
  const token = authToken();
  const opts = {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'X-Nexus-Token': token } : {}),
    },
  };
  if (body) {
    opts.body = isForm ? body : JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/api/v1${path}`, opts);
  const isAuthAttempt = path === '/auth/login' || path === '/auth/signup';
  if (res.status === 401 || res.status === 403) {
    if (isAuthAttempt) {
      let msg = `HTTP ${res.status}`;
      try { const d = await res.json(); msg = d.message || d.error || msg; } catch (_) {}
      throw new Error(msg);
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d.message || d.error || msg; } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

const get  = (path)             => req('GET',    path);
const post = (path, body, f)    => req('POST',   path, body, f);
const put  = (path, body)       => req('PUT',    path, body);
const patch= (path, body)       => req('PATCH',  path, body);
const del  = (path)             => req('DELETE', path);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login:  (email, password, tenantSlug) => post('/auth/login',  { email, password, tenant_slug: tenantSlug }),
    signup: (email, password, name, tenantSlug) => post('/auth/signup', { email, password, display_name: name, tenant_slug: tenantSlug }),
    me:     ()                      => get('/auth/me'),
    logout: ()                      => post('/auth/logout'),
  },

  // ── Admin — Tenant Management ──────────────────────────────────────────────
  admin: {
    tenants: {
      list:        ()           => get('/admin/tenants'),
      get:         (slug)       => get(`/admin/tenants/${slug}`),
      provision:   (body)       => post('/admin/tenants', body),
      update:      (slug, body) => patch(`/admin/tenants/${slug}`, body),
      suspend:     (slug)       => post(`/admin/tenants/${slug}/suspend`),
      deprovision: (slug)       => del(`/admin/tenants/${slug}`),
    },
  },

  // ── Chat ───────────────────────────────────────────────────────────────────
  chat: {
    ask:             (body)           => post('/chat/ask', body),
    conversations:   ()               => get('/chat/conversations'),
    conversation:    (id)             => get(`/chat/conversations/${id}`),
    deleteConversation: (id)          => del(`/chat/conversations/${id}`),
    pinConversation: (id, pinned)     => patch(`/chat/conversations/${id}/pin`, { pinned }),
    feedback:        (runKey, body)   => post(`/chat/runs/${runKey}/feedback`, body),
    asyncResult:     (execKey)        => get(`/chat/async/${execKey}`),
  },

  // ── Memory ─────────────────────────────────────────────────────────────────
  memory: {
    list:    (domainKey) => get(`/memory/documents?domainKey=${encodeURIComponent(domainKey)}`),
    upload:  (formData)  => post('/memory/documents', formData, true),
    update:  (key, body) => patch(`/memory/documents/${key}`, body),
    archive: (key)       => del(`/memory/documents/${key}`),
  },

  // ── Connections ────────────────────────────────────────────────────────────
  connections: {
    list:    ()          => get('/connections'),
    create:  (body)      => post('/connections', body),
    update:  (key, body) => put(`/connections/${key}`, body),
    delete:  (key)       => del(`/connections/${key}`),
    test:    (key)       => post(`/connections/${key}/test`),
    catalog: (key, schema = 'public', query = '') =>
                             get(`/connections/${encodeURIComponent(key)}/catalog?schema=${encodeURIComponent(schema)}&query=${encodeURIComponent(query)}`),
  },

  // ── Domains ────────────────────────────────────────────────────────────────
  domains: {
    list:   ()          => get('/domains'),
    create: (body)      => post('/domains', body),
    delete: (key)       => del(`/domains/${key}`),
  },

  // ── Enterprise Map ─────────────────────────────────────────────────────────
  enterprise: {
    objects:        (domainKey)     => get(`/enterprise-map/objects?domainKey=${encodeURIComponent(domainKey)}`),
    createObject:   (body)          => post('/enterprise-map/objects', body),
    deleteObject:   (key)           => del(`/enterprise-map/objects/${key}`),
    columns:        (key)           => get(`/enterprise-map/objects/${key}/columns`),
    updateColumn:   (key, col, b)   => patch(`/enterprise-map/objects/${key}/columns/${col}`, b),
    versions:       (key)           => get(`/enterprise-map/objects/${key}/versions`),
    rollback:       (key, ver)      => post(`/enterprise-map/objects/${key}/versions/${ver}/rollback`),
    scan:           (key)           => post(`/enterprise-map/objects/${key}/scan`),
    notes:          (domainKey)     => get(`/enterprise-map/notes?domainKey=${encodeURIComponent(domainKey)}`),
    createNote:     (body)          => post('/enterprise-map/notes', body),
    deleteNote:     (key)           => del(`/enterprise-map/notes/${key}`),
    policy:         ()              => get('/enterprise-map/policy'),
    onboardAnalyze: (body)          => post('/enterprise-map/onboarding/analyze', body),
    onboardSimulate:(body)          => post('/enterprise-map/onboarding/simulate', body),
  },

  // ── Semantic ───────────────────────────────────────────────────────────────
  semantic: {
    entities:        (domainKey)    => get(`/semantic/entities?domainKey=${encodeURIComponent(domainKey)}`),
    createEntity:    (body)         => post('/semantic/entities', body),
    deleteEntity:    (key)          => del(`/semantic/entities/${key}`),
    relationships:   (key)          => get(`/semantic/entities/${key}/relationships`),
    createRelation:  (key, body)    => post(`/semantic/entities/${key}/relationships`, body),
    mappings:        (key)          => get(`/semantic/entities/${key}/mappings`),
    createMapping:   (key, body)    => post(`/semantic/entities/${key}/mappings`, body),
    lifecycle:       (key)          => get(`/semantic/entities/${key}/lifecycle`),
    createLifecycle: (key, body)    => post(`/semantic/entities/${key}/lifecycle`, body),
    vocabulary:      (domainKey)    => get(`/semantic/vocabulary?domainKey=${encodeURIComponent(domainKey)}`),
    createVocab:     (body)         => post('/semantic/vocabulary', body),
    discover:             (body)          => post('/semantic/discover', body),
    discoverRelationships:(body)          => post('/semantic/discover-relationships', body),
    // ── Phase 3: Semantic Learning endpoints ─────────────────────────────────
    learnings: {
      list:    (domainKey) => get(`/semantic/learnings${domainKey ? `?domainKey=${encodeURIComponent(domainKey)}` : ''}`),
      update:  (key, body) => patch(`/semantic/learnings/${key}`, body),
      promote: (key)       => post(`/semantic/learnings/${key}/promote`),
      delete:  (key)       => del(`/semantic/learnings/${key}`),
    },
  },

  // ── Agents ─────────────────────────────────────────────────────────────────
  agents: {
    list:            ()             => get('/agents'),
    create:          (body)         => post('/agents', body),
    update:          (key, body)    => put(`/agents/${key}`, body),
    delete:          (key)          => del(`/agents/${key}`),
    kpis:            (key)          => get(`/agents/${key}/kpis`),
    createKpi:       (key, body)    => post(`/agents/${key}/kpis`, body),
    playbooks:       (key)          => get(`/agents/${key}/playbooks`),
    createPlaybook:  (key, body)    => post(`/agents/${key}/playbooks`, body),
    deletePlaybook:  (agKey, pbKey) => del(`/agents/${agKey}/playbooks/${pbKey}`),
    versions:        (key)          => get(`/agents/${key}/versions`),
    rollback:        (key, ver)     => post(`/agents/${key}/versions/${ver}/rollback`),
  },

  // ── Reasoning ──────────────────────────────────────────────────────────────
  reasoning: {
    sessions:       ()              => get('/reasoning/sessions'),
    session:        (key)           => get(`/reasoning/sessions/${key}`),
    findings:       ()              => get('/reasoning/findings'),
    finding:        (key)           => get(`/reasoning/findings/${key}`),
    resolveFinding: (key, body)     => patch(`/reasoning/findings/${key}`, body),
  },

  // ── Temporal ───────────────────────────────────────────────────────────────
  temporal: {
    baselines:       ()             => get('/temporal/baselines'),
    createBaseline:  (body)         => post('/temporal/baselines', body),
    refreshBaseline: (key)          => post(`/temporal/baselines/${key}/refresh`),
    anomalies:       ()             => get('/temporal/anomalies'),
    anomaly:         (key)          => get(`/temporal/anomalies/${key}`),
    patchAnomaly:    (key, body)    => patch(`/temporal/anomalies/${key}`, body),
  },

  // ── Onboarding ─────────────────────────────────────────────────────────────
  onboarding: {
    status:    ()     => get('/onboarding/status'),
    recommend: (body) => post('/onboarding/recommend', body),
    scan:      (body) => post('/onboarding/scan', body),
    analyze:   (body) => post('/onboarding/analyze', body),
    apply:     (body) => post('/onboarding/apply', body),
    complete:  ()     => post('/onboarding/complete'),
    reset:     ()     => post('/onboarding/reset'),
  },

  // ── Knowledge Graph ────────────────────────────────────────────────────────
  graph: {
    full:      (domainKey)     => get(domainKey ? `/knowledge-graph?domainKey=${encodeURIComponent(domainKey)}` : '/knowledge-graph'),
    neighbors: (entityKey, depth = 2) => get(`/knowledge-graph/neighbors/${encodeURIComponent(entityKey)}?depth=${depth}`),
    paths:     (from, to)      => get(`/knowledge-graph/paths?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    context:   (domainKeys)    => get(`/knowledge-graph/context?domainKeys=${encodeURIComponent(domainKeys)}`),
  },

  // ── Knowledge Gaps ─────────────────────────────────────────────────────────
  gaps: {
    list:           ()              => get('/knowledge-gaps'),
    dismiss:        (key)           => post(`/knowledge-gaps/${key}/dismiss`),
    resolve:        (key, body)     => post(`/knowledge-gaps/${key}/resolve`, body),
    resolveSource:  (key, body)     => post(`/knowledge-gaps/${key}/resolve-source`, body),
  },

  // ── Query Executions ───────────────────────────────────────────────────────
  query: {
    get: (key) => get(`/query-executions/${key}`),
  },

  // ── Chat Attachments (file upload + image paste) ──────────────────────────
  attachments: {
    upload: (file, conversationId) => {
      const form = new FormData();
      form.append('file', file);
      if (conversationId) form.append('conversationId', conversationId);
      return post('/chat/attachments', form, true);
    },
    get:  (key) => get(`/chat/attachments/${key}`),
    list: (conversationId) => get(`/chat/attachments?conversationId=${encodeURIComponent(conversationId)}`),
  },

  // ── Scheduled Reports ──────────────────────────────────────────────────────
  reports: {
    list:   ()           => get('/reports'),
    create: (body)       => post('/reports', body),
    update: (key, body)  => put(`/reports/${key}`, body),
    delete: (key)        => del(`/reports/${key}`),
    run:    (key)        => post(`/reports/${key}/run`),
  },

  // ── Industry Context Packs ─────────────────────────────────────────────────
  industryPacks: {
    list:    ()                      => get('/industry-packs'),
    get:     (packKey)               => get(`/industry-packs/${packKey}`),
    applied: ()                      => get('/industry-packs/applied'),
    recommend: (domainKey)           => get(`/industry-packs/recommend${domainKey ? `?domainKey=${encodeURIComponent(domainKey)}` : ''}`),
    preview: (packKey, body)         => post(`/industry-packs/${packKey}/preview`, body || {}),
    apply:   (packKey, body)         => post(`/industry-packs/${packKey}/apply`, body),
    remove:  (packKey)               => del(`/industry-packs/applied/${packKey}`),
  },

  // ── Governance Hub ─────────────────────────────────────────────────────────
  governance: {
    columnPolicies: {
      list:   ()           => get('/governance/column-policies'),
      create: (body)       => post('/governance/column-policies', body),
      update: (key, body)  => patch(`/governance/column-policies/${key}`, body),
      delete: (key)        => del(`/governance/column-policies/${key}`),
    },
    rlsPolicies: {
      list:      ()            => get('/governance/rls-policies'),
      create:    (body)        => post('/governance/rls-policies', body),
      setActive: (key, active) => patch(`/governance/rls-policies/${key}/status`, { isActive: active }),
      delete:    (key)         => del(`/governance/rls-policies/${key}`),
    },
    contracts: {
      list:   ()           => get('/governance/contracts'),
      create: (body)       => post('/governance/contracts', body),
      delete: (key)        => del(`/governance/contracts/${key}`),
    },
    users: {
      getAttributes: (email)        => get(`/governance/users/${encodeURIComponent(email)}/attributes`),
      setAttributes: (email, attrs) => put(`/governance/users/${encodeURIComponent(email)}/attributes`, attrs),
    },
    audit: {
      list:   (params = {}) => {
        const q = new URLSearchParams();
        if (params.userEmail)    q.set('userEmail',    params.userEmail);
        if (params.eventType)    q.set('eventType',    params.eventType);
        if (params.connectionKey) q.set('connectionKey', params.connectionKey);
        if (params.from)         q.set('from',         params.from);
        if (params.to)           q.set('to',           params.to);
        if (params.page != null) q.set('page',         params.page);
        if (params.size != null) q.set('size',         params.size);
        return get(`/governance/audit?${q.toString()}`);
      },
      export: (params = {}) => {
        const q = new URLSearchParams();
        if (params.userEmail) q.set('userEmail', params.userEmail);
        if (params.eventType) q.set('eventType', params.eventType);
        return get(`/governance/audit/export?${q.toString()}`);
      },
    },
    simulate: (body) => post('/governance/simulate', body),
  },

  // ── Proactive Alerts ───────────────────────────────────────────────────────
  alerts: {
    list:        (limit = 50)  => get(`/alerts?limit=${limit}`),
    unreadCount: ()            => get('/alerts/unread-count'),
    markRead:    (key)         => post(`/alerts/${key}/read`),
    markAllRead: ()            => post('/alerts/read-all'),
    rules: {
      list:   ()           => get('/alert-rules'),
      create: (body)       => post('/alert-rules', body),
      update: (key, body)  => put(`/alert-rules/${key}`, body),
      delete: (key)        => del(`/alert-rules/${key}`),
      test:   (key)        => post(`/alert-rules/${key}/test`),
    },
  },
};
