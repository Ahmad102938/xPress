"use client";

import { useState, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@acurexpress/ui";
import { archiveDependent, restoreDependent } from "../actions";
import type { PatientProfile } from "../server/selected-profile";
import { PersonForm } from "./person-form";
import { ProfileAvatar } from "./profile-avatar";

/**
 * Family profiles on /account (docs/specs/signed-in-home.md item 40): add, edit, archive and
 * restore dependents. Archived profiles carry a text label (not colour alone) and a Restore button.
 */
export function FamilyList({ dependents }: { dependents: PatientProfile[] }) {
  const t = useTranslations("family");
  const router = useRouter();
  const [editing, setEditing] = useState<PatientProfile | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error ?? "unavailable");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {dependents.map((person) => (
          <li
            key={person.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3"
          >
            <ProfileAvatar name={person.fullName} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{person.fullName}</p>
              <p className="text-sm text-muted">
                {t(`relationships.${person.relationship}`)}
                {person.archived ? (
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-body">
                    {t("archived")}
                  </span>
                ) : null}
              </p>
            </div>
            {person.archived ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => restoreDependent(person.id))}
              >
                {t("restore")}
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(person)}>
                  {t("edit")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" disabled={pending}>
                      {t("archive")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>
                      {t("confirmArchiveTitle", { name: person.fullName })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("confirmArchiveBody", { name: person.fullName })}
                    </AlertDialogDescription>
                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                      <Button onClick={() => run(() => archiveDependent(person.id))}>
                        {t("archive")}
                      </Button>
                      <AlertDialogCancel className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold text-ink">
                        {t("cancel")}
                      </AlertDialogCancel>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </li>
        ))}
      </ul>
      {dependents.some((person) => person.archived) ? (
        <p className="text-sm text-muted">{t("archivedHelp")}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-error">
          {t(`errors.${error}` as "errors.unavailable")}
        </p>
      ) : null}
      <Button variant="outline" className="self-start" onClick={() => setEditing("new")}>
        {t("add")}
      </Button>
      <Dialog open={editing !== null} onOpenChange={(open) => (open ? null : setEditing(null))}>
        {editing ? (
          <DialogContent closeLabel={t("cancel")}>
            <DialogTitle>
              {editing === "new"
                ? t("form.addTitle")
                : t("form.editTitle", { name: editing.fullName })}
            </DialogTitle>
            <PersonForm
              {...(editing === "new" ? {} : { profile: editing })}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
