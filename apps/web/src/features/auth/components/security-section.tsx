"use client";

import { useId, useState, useTransition } from "react";
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
import { clearClientState } from "@/features/session/clear-client-state";
import { useSignOut } from "@/features/session/use-sign-out";
import { cancelAccountDeletion, requestAccountDeletion, signOutEverywhere } from "../actions";
import { useReverify } from "./reverify-dialog";

/**
 * Account security (docs/specs/signed-in-home.md item 48): sign out on this device, sign out
 * everywhere, and the account deletion request. The last two are confirmed in a dialog that names
 * the action and need a recent sign-in (re-verify dialog). A deletion request deletes nothing.
 */
export function SecuritySection({ deletionRequested }: { deletionRequested: boolean }) {
  const t = useTranslations("security");
  const router = useRouter();
  const id = useId();
  const { signOut, pending: signingOut } = useSignOut();
  const { guard, dialog } = useReverify();
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<"error" | "cancelled" | null>(null);
  const word = t("confirmWord");

  function leaveEverywhere() {
    clearClientState();
    window.location.replace("/");
  }

  function signOutAll() {
    setMessage(null);
    startTransition(async () => {
      const result = await guard("sign_out_all", () => signOutEverywhere());
      if (!result) return;
      if (result.ok) leaveEverywhere();
      else setMessage("error");
    });
  }

  function requestDeletion() {
    if (typed.trim() !== word) return;
    setMessage(null);
    startTransition(async () => {
      const result = await guard("delete_request", () => requestAccountDeletion());
      if (!result) return;
      if (result.ok) leaveEverywhere();
      else setMessage("error");
    });
  }

  function withdraw() {
    startTransition(async () => {
      const result = await cancelAccountDeletion();
      setMessage(result.ok ? "cancelled" : "error");
      if (result.ok) router.refresh();
    });
  }

  const actionClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold focus-visible:outline-2 focus-visible:outline-brand-blue";

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5">
      {dialog}
      <div>
        <h2 id={`${id}-title`} className="text-lg font-bold text-ink">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-body">{t("intro")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={signingOut} onClick={() => void signOut()}>
          {t("signOut")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
              {t("signOutAll")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>{t("confirmSignOutAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmSignOutAllBody")}</AlertDialogDescription>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button disabled={pending} onClick={signOutAll}>
                {t("signOutAll")}
              </Button>
              <AlertDialogCancel className={`${actionClass} border border-line text-ink`}>
                {t("cancel")}
              </AlertDialogCancel>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <p className="-mt-3 text-sm text-muted">{t("signOutAllHelp")}</p>

      <div className="rounded-2xl border border-line p-4">
        <h3 className="font-semibold text-ink">{t("deleteTitle")}</h3>
        <p className="mt-1 text-sm text-body">{t("deleteHelp")}</p>
        {deletionRequested ? (
          <div className="mt-3 flex flex-col gap-2">
            <p role="status" className="text-sm font-medium text-ink">
              {t("requested")}
            </p>
            <Button variant="outline" disabled={pending} onClick={withdraw} className="self-start">
              {t("cancelRequest")}
            </Button>
          </div>
        ) : (
          <AlertDialog onOpenChange={() => setTyped("")}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-3 border-error text-error">
                {t("requestDeletion")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmDeleteBody")}</AlertDialogDescription>
              <label htmlFor={`${id}-confirm`} className="text-sm font-semibold text-ink">
                {t("typeToConfirm", { word })}
              </label>
              <input
                id={`${id}-confirm`}
                value={typed}
                autoComplete="off"
                onChange={(event) => setTyped(event.target.value)}
                className="min-h-11 rounded-lg border border-line px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand-blue"
              />
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  disabled={pending || typed.trim() !== word}
                  onClick={requestDeletion}
                  className="bg-error text-white hover:bg-error/90"
                >
                  {t("requestDeletion")}
                </Button>
                <AlertDialogCancel className={`${actionClass} border border-line text-ink`}>
                  {t("cancel")}
                </AlertDialogCancel>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {message ? (
        <p
          role={message === "error" ? "alert" : "status"}
          className={message === "error" ? "text-sm text-error" : "text-sm text-ink"}
        >
          {message === "error" ? t("error") : t("cancelled")}
        </p>
      ) : null}
    </section>
  );
}
