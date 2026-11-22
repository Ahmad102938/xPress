import {
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  HeartPulse,
  Smile,
  Sparkles,
  Stethoscope,
  Venus,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SpecialitySlug } from "@/lib/mock/types";

const icons: Record<SpecialitySlug, LucideIcon> = {
  "general-physician": Stethoscope,
  paediatrics: Baby,
  gynaecology: Venus,
  dermatology: Sparkles,
  orthopaedics: Bone,
  ent: Ear,
  dental: Smile,
  cardiology: HeartPulse,
  "eye-care": Eye,
  psychiatry: Brain,
};

const tones = [
  "bg-tint-blue text-brand-blue",
  "bg-tint-green text-green-ink",
  "bg-tint-cream text-warning",
] as const;

export function SpecialityTile({ slug, index = 0 }: { slug: SpecialitySlug; index?: number }) {
  const t = useTranslations("specialities.names");
  const Icon = icons[slug];
  return (
    <Link
      href={{ pathname: "/doctors", query: { speciality: slug } }}
      className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-panel p-2 text-center transition hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-md"
    >
      <span
        className={`flex size-12 items-center justify-center rounded-full ${tones[index % tones.length]}`}
      >
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <span className="text-[13px] leading-tight font-medium text-ink">{t(slug)}</span>
    </Link>
  );
}
