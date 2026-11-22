/**
 * HCQ admin panel (approvals, verification, operations). Staff only, MFA required.
 *
 * TODO(admin): placeholder only. No routes yet. Add an auth guard (server-side session + role check
 * from user_roles, never user_metadata) before adding any page here.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
