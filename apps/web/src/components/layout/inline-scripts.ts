import { EMERGENCY_DISMISSED_KEY } from "@/config/emergency";

/**
 * Source of the inline scripts the shell renders before first paint. Kept as constants so the CSP
 * can reason about them (docs/specs/signed-in-home.md item 27).
 */
export const EMERGENCY_BAR_SCRIPT = `try{if(sessionStorage.getItem("${EMERGENCY_DISMISSED_KEY}"))document.documentElement.dataset.emergencyDismissed="1"}catch(e){}`;
