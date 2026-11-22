import type { SVGProps } from "react";

/*
 * Solid (filled) brand icons for the promise strip. Drawn on a 24px grid; colour comes from
 * `currentColor`, details are knocked out in white. Decorative: always pass aria-hidden.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" } as const;

export function DeliveryTruckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        d="M3.5 5h10A1.5 1.5 0 0 1 15 6.5V9h3.2c.47 0 .92.22 1.2.6l2.3 3.1c.2.26.3.58.3.9v2.9a1.5 1.5 0 0 1-1.5 1.5H20a3 3 0 0 0-6 0h-4a3 3 0 0 0-6 0h-.5A1.5 1.5 0 0 1 2 16.5v-10A1.5 1.5 0 0 1 3.5 5Z"
      />
      <path fill="#fff" d="M16 10.4h2.5l1.8 2.6H16z" />
      <path stroke="#fff" strokeWidth="1.4" strokeLinecap="round" d="M5 8.5h5M4 11h4" />
      <circle cx="7" cy="18" r="2.3" fill="currentColor" stroke="#fff" strokeWidth="1.3" />
      <circle cx="17" cy="18" r="2.3" fill="currentColor" stroke="#fff" strokeWidth="1.3" />
    </svg>
  );
}

export function SupportClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.8V12l3.6 2.2"
      />
      <circle cx="12" cy="12" r="1.3" fill="#fff" />
    </svg>
  );
}

export function AuthenticShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        d="M12 2.2 4.3 5.1a1 1 0 0 0-.65.94v5.6c0 4.8 3.3 8.9 7.9 10.2.3.08.6.08.9 0 4.6-1.3 7.9-5.4 7.9-10.2v-5.6a1 1 0 0 0-.65-.94Z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.4 12.1 2.5 2.5 4.8-5"
      />
    </svg>
  );
}

export function PriceTagIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        fill="currentColor"
        d="M3 4.6A1.6 1.6 0 0 1 4.6 3h6.3c.43 0 .83.17 1.13.47l8.5 8.5a1.6 1.6 0 0 1 0 2.26l-6.3 6.3a1.6 1.6 0 0 1-2.26 0l-8.5-8.5A1.6 1.6 0 0 1 3 10.9Z"
      />
      <circle cx="7.6" cy="7.6" r="1.7" fill="#fff" />
      <path stroke="#fff" strokeWidth="1.6" strokeLinecap="round" d="m11.2 14.8 3.6-3.6" />
    </svg>
  );
}
