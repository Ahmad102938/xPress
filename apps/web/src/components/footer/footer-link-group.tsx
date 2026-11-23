import { useTranslations } from "next-intl";
import { footerHref, type FooterGroup } from "@/config/footer-links";
import { Link } from "@/i18n/navigation";
import { FooterAccordion } from "./footer-accordion";

/** A footer column: heading plus links (accordion on small screens). */
export function FooterLinkGroup({ group }: { group: FooterGroup }) {
  const t = useTranslations("footer");
  return (
    <FooterAccordion title={t(`groups.${group.key}`)}>
      <ul className="md:mt-1">
        {group.links.map((link) => (
          <li key={link.key}>
            <Link
              href={footerHref(link)}
              className="inline-flex min-h-11 items-center text-sm text-white/90 underline-offset-4 hover:text-white hover:underline md:min-h-8"
            >
              {t(`links.${link.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </FooterAccordion>
  );
}
