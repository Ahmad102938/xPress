import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { IS_SAMPLE_DATA } from "@/lib/mock";

/** Visible notice next to mock-backed sections, so sample content never reads as a real claim. */
export function SampleDataNote() {
  const t = useTranslations("common");
  if (!IS_SAMPLE_DATA) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-body">
      <Info aria-hidden="true" className="size-3.5 shrink-0" />
      {t("sampleData")}
    </p>
  );
}
