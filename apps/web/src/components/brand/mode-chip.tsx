import { MapPin, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@acurexpress/ui";
import type { ConsultationMode } from "@/lib/mock/types";

/** Consultation mode label: video icon for Online, map pin for At clinic (§25). Icon plus text. */
export function ModeChip({ mode }: { mode: ConsultationMode }) {
  const t = useTranslations("doctors");
  return mode === "online" ? (
    <Badge variant="blue">
      <Video aria-hidden="true" />
      {t("online")}
    </Badge>
  ) : (
    <Badge variant="green">
      <MapPin aria-hidden="true" />
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
