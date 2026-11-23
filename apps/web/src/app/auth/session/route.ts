import { authState, initialsOf, type GateState } from "@/features/auth/server/auth-state";

/**
 * Header session state for the client island (docs/specs/auth.md item 26). Never cached, never
 * returns contact details: only the gate state, the display name, an https avatar and initials.
 * Fails safe to signed_out.
 */
export interface SessionView {
  state: GateState;
  name: string | null;
  avatarUrl: string | null;
  initials: string;
}

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  let view: SessionView = { state: "signed_out", name: null, avatarUrl: null, initials: "" };
  try {
    const auth = await authState();
    view = {
      state: auth.state,
      name: auth.state === "signed_in" ? auth.fullName : null,
      avatarUrl: auth.state === "signed_in" ? auth.avatarUrl : null,
      initials: auth.state === "signed_in" ? initialsOf(auth.fullName) : "",
    };
  } catch {
    // Fail safe: the header shows the Login button.
  }
  return Response.json(view, { headers: NO_STORE });
}
