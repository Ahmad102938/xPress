"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@acurexpress/ui";
import { deleteAddress, setDefaultAddress, upsertAddress } from "../actions";

export interface AddressView {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const ISSUES = new Set(["required", "too_long", "invalid_pincode"]);

/** Saved addresses of ONE patient profile (docs/specs/signed-in-home.md item 40). */
export function AddressManager({
  patientProfileId,
  addresses,
}: {
  patientProfileId: string;
  addresses: AddressView[];
}) {
  const t = useTranslations("profile");
  const tFamily = useTranslations("family");
  const router = useRouter();
  const id = useId();
  const [editing, setEditing] = useState<AddressView | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: boolean; error?: string; issue?: string }>,
    after?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        after?.();
        router.refresh();
      } else
        setError(
          result.issue && ISSUES.has(result.issue)
            ? `issues.${result.issue}`
            : `errors.${result.error ?? "unavailable"}`,
        );
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const current = editing;
    run(
      () =>
        upsertAddress({
          patientProfileId,
          ...(current && current !== "new" ? { addressId: current.id } : {}),
          label: value("label"),
          line1: value("line1"),
          line2: value("line2"),
          landmark: value("landmark"),
          city: value("city"),
          state: value("state"),
          pincode: value("pincode"),
        }),
      () => setEditing(null),
    );
  }

  const input =
    "min-h-11 rounded-lg border border-line bg-panel px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand-blue";
  const fields: Array<{
    name: keyof AddressView;
    key: string;
    required?: boolean;
    autoComplete?: string;
    inputMode?: "numeric";
  }> = [
    { name: "label", key: "address.label", required: true },
    { name: "line1", key: "address.line1", required: true, autoComplete: "address-line1" },
    { name: "line2", key: "address.line2", autoComplete: "address-line2" },
    { name: "landmark", key: "address.landmark" },
    { name: "city", key: "address.city", required: true, autoComplete: "address-level2" },
    { name: "state", key: "address.state", required: true, autoComplete: "address-level1" },
    {
      name: "pincode",
      key: "address.pincode",
      required: true,
      autoComplete: "postal-code",
      inputMode: "numeric",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 ? <p className="text-sm text-body">{t("noAddresses")}</p> : null}
      <ul className="flex flex-col gap-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="flex flex-wrap items-start gap-3 rounded-2xl border border-line p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {address.label}
                {address.isDefault ? (
                  <span className="ml-2 rounded-full border border-brand-blue px-2 py-0.5 text-xs font-semibold text-brand-blue">
                    {t("default")}
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-body">
                {[address.line1, address.line2, address.landmark, address.city, address.state]
                  .filter(Boolean)
                  .join(", ")}{" "}
                {address.pincode}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {address.isDefault ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setDefaultAddress(address.id))}
                >
                  {t("makeDefault")}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(address)}>
                {t("editAddress")}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" disabled={pending}>
                    {t("deleteAddress")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("confirmDeleteBody", { label: address.label })}
                  </AlertDialogDescription>
                  <div className="flex flex-col gap-2 sm:flex-row-reverse">
                    <Button onClick={() => run(() => deleteAddress(address.id))}>
                      {t("deleteAddress")}
                    </Button>
                    <AlertDialogCancel className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold text-ink">
                      {t("address.cancel")}
                    </AlertDialogCancel>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-3 rounded-2xl border border-line p-4"
        >
          <h3 className="font-semibold text-ink">
            {editing === "new" ? t("addAddress") : t("editAddress")}
          </h3>
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${field.name}`} className="text-sm font-semibold text-ink">
                {t(field.key as "address.label")}
              </label>
              <input
                id={`${id}-${field.name}`}
                name={field.name}
                required={field.required}
                autoComplete={field.autoComplete}
                inputMode={field.inputMode}
                maxLength={field.name === "pincode" ? 6 : undefined}
                defaultValue={editing === "new" ? "" : String(editing[field.name] ?? "")}
                aria-describedby={field.name === "label" ? `${id}-label-hint` : undefined}
                className={input}
              />
              {field.name === "label" ? (
                <p id={`${id}-label-hint`} className="text-xs text-muted">
                  {t("address.labelHint")}
                </p>
              ) : null}
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {t("address.save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {t("address.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setEditing("new")}>
          {t("addAddress")}
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-error">
          {tFamily(error as "errors.unavailable")}
        </p>
      ) : null}
    </div>
  );
}
