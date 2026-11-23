import { Bot, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Bar } from "./hero-art";
import { HeroSlide, type HeroSlideProps } from "./hero-slide";

/** Chat with the AI Health Consultant, with its "not a diagnosis" note. Only when the flag is on. */
function AssistantVisual() {
  const t = useTranslations("hero.visual");
  return (
    <div className="relative h-[21rem] w-[27rem]">
      <div className="absolute top-2 left-1/2 w-80 -translate-x-1/2 rounded-2xl bg-panel p-4 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-deep-blue">
            <Bot className="size-5 text-white" />
          </span>
          <Bar className="w-24 bg-ink/60" />
        </div>
        <p className="mt-3 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand-blue px-3 py-2 text-[13px] text-white">
          {t("aiAsk")}
        </p>
        <div className="mt-3 w-4/5 space-y-1.5 rounded-2xl rounded-bl-sm bg-page p-3">
          <Bar className="w-full bg-line" />
          <Bar className="w-5/6 bg-line" />
          <Bar className="w-2/3 bg-line" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-warning-bg px-2 py-1.5 text-[13px] font-semibold text-warning">
          <Info className="size-4 shrink-0" />
          {t("aiNote")}
        </p>
      </div>
    </div>
  );
}

export function HeroSlideAssistant(props: HeroSlideProps) {
  return <HeroSlide {...props} icon={Bot} visual={<AssistantVisual />} />;
}
