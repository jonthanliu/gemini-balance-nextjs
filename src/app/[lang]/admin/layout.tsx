import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { getSettings } from "@/lib/settings";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminClientLayout from "./AdminClientLayout";

export default async function AdminLayout({
  children,
  params: paramsPromise,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await paramsPromise;
  // This is a server component, so we can safely access the database here.
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get("auth_token")?.value;
  const { AUTH_TOKEN: storedAuthTokenHash } = await getSettings();

  let isAuthorized = false;
  if (tokenFromCookie && storedAuthTokenHash) {
    isAuthorized = await bcrypt.compare(tokenFromCookie, storedAuthTokenHash);
  }

  // If the cookie is missing, or if it's present but doesn't match the
  // hashed token in the database, redirect to the login page for the current locale.
  if (!isAuthorized) {
    redirect(`/${lang}`);
  }

  const dictionary = await getDictionary(lang);

  // If validation passes, render the client layout and the page content.
  return (
    <AdminClientLayout dictionary={dictionary} lang={lang}>
      {children}
    </AdminClientLayout>
  );
}
