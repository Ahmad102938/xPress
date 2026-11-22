/**
 * Signed-in patient area (appointments, records, orders, profile).
 *
 * TODO(patient): placeholder only. No routes yet. Add an auth guard (server-side session + role check
 * from user_roles, never user_metadata) before adding any page here.
 */
export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
