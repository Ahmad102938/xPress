import type { ReactNode } from "react";

/**
 * Title row shared by the private pages: 1280px container, 24/32px rhythm, same panel style as the
 * signed-in home (white 12px panel, hairline border, soft shadow).
 */
export function PrivatePage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:py-8">
      <div className="border-b border-line pb-4 md:pb-5">
        <h1 className="text-2xl leading-tight font-extrabold text-balance text-ink md:text-3xl">
          {title}
        </h1>
        {intro ? <p className="mt-1 max-w-prose text-body">{intro}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  id,
  title,
  children,
}: {
  id?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id && title ? `${id}-heading` : undefined}
      className="panel scroll-mt-24 border border-line p-4 sm:p-5 md:p-6"
    >
      {title ? (
        <h2
          id={id ? `${id}-heading` : undefined}
          className="mb-4 text-lg leading-tight font-bold text-ink md:text-xl"
        >
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
