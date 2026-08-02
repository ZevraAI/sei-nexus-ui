/** ============================================================================
 *  TenantContext — the customer organization is a first-class, global identity.
 *
 *  Loaded from the authenticated session (see App.jsx: the user object returned by
 *  /auth/me, plus any active impersonation). Every module (Home, Investigations,
 *  Agents, Reports, Chat, Admin) reads tenant identity from here — no prop drilling,
 *  no hardcoding. Missing fields degrade gracefully (generated avatar, sensible
 *  defaults) so the shell never shows a broken identity.
 *
 *  Backend contract (see identifyMissingApis in the migration notes): the session
 *  bootstrap should expose tenant_name, tenant_short_name, tenant_logo_url,
 *  environment, business_unit, workspace_name. Until it does, we derive from what
 *  exists (tenant_schema) and fall back.
 *  ============================================================================ */
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../App.jsx';

const TenantContext = createContext(null);

/** Two-letter monogram for the generated org avatar. */
function deriveShortName(name) {
  if (!name) return 'ORG';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Turn a schema slug (tenant_acme_retail) into a human name (Acme Retail) as a last resort. */
function nameFromSchema(schema) {
  if (!schema || schema === 'public') return null;
  return schema
    .replace(/^tenant_/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || null;
}

/** Derive the whole tenant identity from the session + impersonation, with fallbacks. */
export function resolveTenant(user, impersonation) {
  const src = impersonation || {};
  const resolvedName =
    src.tenantName ||
    user?.tenant_name || user?.tenantName ||
    nameFromSchema(user?.tenant_schema);

  const hasIdentity = !!resolvedName;
  const tenantName = resolvedName || 'Your Organization';

  return {
    tenantId: src.tenantId || user?.tenant_id || user?.tenant_schema || null,
    tenantName,
    tenantShortName: user?.tenant_short_name || src.tenantShortName || deriveShortName(tenantName),
    tenantLogoUrl: user?.tenant_logo_url || src.tenantLogoUrl || null,
    environment: user?.environment || src.environment || 'Production',
    businessUnit: user?.business_unit || src.businessUnit || null,
    workspaceName: user?.workspace_name || src.workspaceName || null,
    /** false → we're showing the generic fallback, not a real tenant name. */
    hasIdentity,
    /** true while a platform admin is viewing another tenant. */
    impersonating: !!impersonation,
    platformName: 'Zevra',
  };
}

export function TenantProvider({ children }) {
  const { user, impersonation } = useAuth();
  const value = useMemo(() => resolveTenant(user, impersonation), [user, impersonation]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

/** Global accessor. Safe outside a provider (returns the neutral fallback). */
export function useTenant() {
  const ctx = useContext(TenantContext);
  if (ctx) return ctx;
  return {
    tenantId: null, tenantName: 'Your Organization', tenantShortName: 'ORG',
    tenantLogoUrl: null, environment: 'Production', businessUnit: null,
    workspaceName: null, hasIdentity: false, impersonating: false, platformName: 'Zevra',
  };
}
