/** Types for TenantContext.jsx — the global tenant identity. */
import type { ReactNode, ReactElement } from 'react';

export interface TenantIdentity {
  tenantId: string | null;
  tenantName: string;
  tenantShortName: string;
  tenantLogoUrl: string | null;
  environment: string;
  businessUnit: string | null;
  workspaceName: string | null;
  /** false → showing the neutral fallback, not a real tenant name. */
  hasIdentity: boolean;
  /** true while a platform admin is viewing another tenant. */
  impersonating: boolean;
  platformName: string;
}

export function resolveTenant(user: unknown, impersonation: unknown): TenantIdentity;
export function TenantProvider(props: { children: ReactNode }): ReactElement;
export function useTenant(): TenantIdentity;
