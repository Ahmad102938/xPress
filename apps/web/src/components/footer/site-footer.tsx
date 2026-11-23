import { useTranslations } from "next-intl";
import { getFlags, type Flags } from "@acurexpress/core";
import { company, showPlaceholders } from "@/config/company";
import { visibleFooterGroups } from "@/config/footer-links";
import { resolvePartnerBase } from "@/config/partner-band";
import { ContactBlock } from "./contact-block";
import { FooterBottomBar } from "./footer-bottom-bar";
import { FooterLinkGroup } from "./footer-link-group";
import { TrustStrip } from "./trust-strip";

async function getCurrentYear() {
  "use cache";
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await getCurrentYear();
  return (
    <FooterContent
      year={year}
      flags={getFlags()}
      partnerBase={resolvePartnerBase()}
      placeholdersVisible={showPlaceholders()}
      paymentsEnabled={company.paymentsEnabled}
    />
  );
}

export interface FooterContentProps {
  year: number;
  flags: Flags;
  /** Partner app base URL, or null to hide the "Become a partner" link. */
  partnerBase: string | null;
  /** Show TODO_HCQ placeholder values (development only). */
  placeholdersVisible: boolean;
  paymentsEnabled: boolean;
}

/**
 * Patient-site footer, compact: four link groups plus a contact column (accordions on mobile),
 * a slim strip with commitments and the always-visible emergency disclaimer, and a bottom bar
 * with icon links (incl. "Become a partner") and the copyright.
 */
export function FooterContent({
  year,
  flags,
  partnerBase,
  placeholdersVisible,
  paymentsEnabled,
}: FooterContentProps) {
  const t = useTranslations("footer");
  const groups = visibleFooterGroups(flags);

  return (
    <footer className="focus-light bg-deep-blue text-white">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 md:pt-8">
        <div className="grid md:grid-cols-4 md:gap-x-6 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)]">
          {groups.map((group) => (
            <FooterLinkGroup key={group.key} group={group} />
          ))}
          <div className="mt-6 md:col-span-4 md:mt-6 lg:col-span-1 lg:mt-0 lg:border-l lg:border-white/15 lg:pl-8">
            <ContactBlock placeholdersVisible={placeholdersVisible} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/15 pt-4">
          <TrustStrip paymentsEnabled={paymentsEnabled} />
          {/* Always visible. TODO_HCQ: confirm final wording (config/company.ts). */}
          <p className="text-[13px] text-white/90">
            {t("disclaimer")} {t("disclaimerConsult")}
          </p>
        </div>
      </div>

      <FooterBottomBar year={year} partnerBase={partnerBase} />
    </footer>
  );
}
