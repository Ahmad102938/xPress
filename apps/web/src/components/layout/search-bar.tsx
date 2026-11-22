"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { cn } from "@acurexpress/ui";

export interface SearchSuggestion {
  id: string;
  label: string;
  /** Localised path. If `appendQuery` is set, the typed query is added as `?q=`. */
  href: string;
  appendQuery?: boolean;
  /** Always shown, whatever the query (for example "Search medicines"). */
  alwaysShow?: boolean;
}

export interface SearchSuggestionGroup {
  id: string;
  label: string;
  items: SearchSuggestion[];
}

interface SearchBarProps {
  /** Localised path the form submits to (GET, `q`). Works without JavaScript. */
  action: string;
  groups: SearchSuggestionGroup[];
  /** Mentions medicines in the placeholder; true only when flags.medicineSales is on. */
  includesMedicines: boolean;
  className?: string;
}

const MAX_PER_GROUP = 4;

function hrefFor(item: SearchSuggestion, query: string) {
  if (!item.appendQuery || !query) return item.href;
  const separator = item.href.includes("?") ? "&" : "?";
  return `${item.href}${separator}q=${encodeURIComponent(query)}`;
}

/** Search box with a suggestions listbox (WAI-ARIA combobox pattern). */
export function SearchBar({ action, groups, includesMedicines, className }: SearchBarProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return groups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => item.alwaysShow || item.label.toLowerCase().includes(q))
          .slice(0, MAX_PER_GROUP),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const flat = filtered.flatMap((group) => group.items);
  const groupOffsets = filtered.reduce<number[]>((offsets, group, i) => {
    const previous = i === 0 ? 0 : (offsets[i - 1] ?? 0) + (filtered[i - 1]?.items.length ?? 0);
    return [...offsets, previous];
  }, []);
  const expanded = open && flat.length > 0;
  const optionId = (i: number) => `${baseId}-option-${i}`;

  function choose(item: SearchSuggestion) {
    setOpen(false);
    router.push(hrefFor(item, query.trim()));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : -1));
    } else if (event.key === "Enter" && expanded && activeIndex >= 0) {
      const item = flat[activeIndex];
      if (item) {
        event.preventDefault();
        choose(item);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form action={action} method="get" role="search" className={cn("relative", className)}>
      <label htmlFor={`${baseId}-input`} className="sr-only">
        {t("label")}
      </label>
      <div className="flex h-12 items-center overflow-hidden rounded-lg border border-input bg-panel focus-within:border-brand-blue">
        <Search aria-hidden="true" className="ml-3 size-5 shrink-0 text-muted" />
        <input
          id={`${baseId}-input`}
          name="q"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          placeholder={includesMedicines ? t("placeholderWithMedicines") : t("placeholder")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-base text-ink placeholder:text-muted focus-visible:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-full min-w-12 shrink-0 cursor-pointer items-center justify-center rounded-r-lg bg-brand-blue px-3 text-sm font-semibold text-white hover:bg-deep-blue"
        >
          <ArrowRight aria-hidden="true" className="size-5 sm:hidden" />
          <span className="sr-only sm:not-sr-only">{t("submit")}</span>
        </button>
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label={t("suggestions")}
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border border-line bg-panel py-1 shadow-lg"
      >
        {filtered.map((group, groupIndex) => (
          <div key={group.id} role="group" aria-labelledby={`${baseId}-${group.id}`}>
            <div
              id={`${baseId}-${group.id}`}
              role="presentation"
              className="px-3 pt-2 pb-1 text-[13px] font-semibold text-muted uppercase"
            >
              {group.label}
            </div>
            {group.items.map((item, itemIndex) => {
              const i = (groupOffsets[groupIndex] ?? 0) + itemIndex;
              return (
                <div
                  key={item.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  // Keep focus in the input while choosing with a pointer.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center px-3 text-sm text-ink",
                    i === activeIndex ? "bg-tint-blue" : "hover:bg-page",
                  )}
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {open && query.trim() ? t("resultsCount", { count: flat.length }) : ""}
      </p>
    </form>
  );
}
