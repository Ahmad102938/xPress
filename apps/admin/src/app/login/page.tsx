import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginPlaceholder } from "@/components/login-placeholder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("metaTitle") };
}

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <LoginPlaceholder />
    </div>
  );
}
