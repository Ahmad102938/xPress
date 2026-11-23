import { Building2, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@acurexpress/ui";
import type { ConsultationMode } from "@/lib/mock/types";

/**
 * Consultation mode label (§25, brief p.8 and p.13): Online = video icon, blue; At clinic = building
 * icon, green. The same icon and tint are used for these two choices everywhere on the page.
 */
export function ModeChip({ mode }: { mode: ConsultationMode }) {
  const t = useTranslations("doctors");
  return mode === "online" ? (
    <Badge variant="blue">
      <Video aria-hidden="true" />
      {t("online")}
    </Badge>
  ) : (
    <Badge variant="green">
      <Building2 aria-hidden="true" />
      {t("atClinic")}
    </Badge>
  );
}

export function ModeChips({ modes }: { modes: readonly ConsultationMode[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {modes.map((mode) => (
        <li key={mode}>
          <ModeChip mode={mode} />
        </li>
      ))}
    </ul>
  );
}
