// A Zevra platform administrator: an ADMIN in the default/public workspace (Zevra staff), as opposed to
// a customer's tenant ADMIN. Same rule Layout.jsx and App.jsx already apply inline.
export function isPlatformAdmin(user) {
  return user?.role === 'ADMIN' && (!user?.tenant_schema || user.tenant_schema === 'public');
}
