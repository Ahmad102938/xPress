import { Clock, Mail, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { company, displayValue, isPlaceholder } from "@/config/company";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const SOCIAL_NAMES = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
} as const;

/**
 * Right-hand column: support contact, registered office and company numbers (only confirmed values
 * in production; TODO_HCQ placeholders appear in development only), social links that have a real
 * URL, and the language switch. Never collapsed.
 */
export function ContactBlock({ placeholdersVisible }: { placeholdersVisible: boolean }) {
  const t = useTranslations("footer");
  const show = (value: string | null) => displayValue(value, placeholdersVisible);
  const email = show(company.support.email);
  const phone = show(company.support.phone);
  const hours = show(company.support.hours);
  const office = show(company.registeredOffice);
  const cin = show(company.cin);
  const gstin = show(company.gstin);
  const social = Object.entries(company.social).filter(
    (entry): entry is [keyof typeof SOCIAL_NAMES, string] => Boolean(entry[1]),
  );
  const contact = [
    email && {
      key: "email",
      icon: Mail,
      label: t("email"),
      value: email,
      href: isPlaceholder(email) ? null : `mailto:${email}`,
    },
    phone && {
      key: "phone",
      icon: Phone,
      label: t("phone"),
      value: phone,
      href: isPlaceholder(phone) ? null : `tel:${phone.replace(/\s+/g, "")}`,
    },
    hours && { key: "hours", icon: Clock, label: t("hours"), value: hours, href: null },
  ].filter(Boolean) as {
    key: string;
    icon: typeof Mail;
    label: string;
    value: string;
    href: string | null;
  }[];

  return (
    <div className="flex flex-col gap-4 text-sm text-white/90">
      {contact.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white/70">{t("support")}</h2>
          <ul className="mt-2 flex flex-col gap-1" data-testid="footer-contact">
            {contact.map(({ key, icon: Icon, label, value, href }) => (
              <li key={key} className="flex items-start gap-2">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="sr-only">{label}: </span>
                  {href ? (
                    <a href={href} className="underline-offset-4 hover:underline">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(office || cin || gstin) && (
        <div data-testid="footer-company">
          <h2 className="text-sm font-semibold text-white/70">{t("officeHeading")}</h2>
          <address className="mt-2 not-italic">
            {office && <p>{office}</p>}
            {cin && <p>{t("cin", { cin })}</p>}
            {gstin && <p>{t("gstin", { gstin })}</p>}
          </address>
        </div>
      )}
      {social.length > 0 && (
        <nav aria-label={t("social")}>
          <ul className="flex flex-wrap gap-x-4">
            {social.map(([network, url]) => (
              <li key={network}>
                <a
                  href={url}
                  className="inline-flex min-h-11 items-center hover:underline md:min-h-8"
                >
                  {SOCIAL_NAMES[network]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <LanguageSwitcher tone="light" className="-ml-1.5" />
    </div>
  );
}
