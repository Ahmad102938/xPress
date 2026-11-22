import en from "./en.json";
import hi from "./hi.json";

/**
 * Strings used by the shared components (namespaces `badges` and `rating`). Each app merges these
 * into its next-intl messages, so the wording of the doctor badges is identical everywhere.
 */
export const uiMessages = { en, hi } as const;

export type UiMessages = typeof en;
