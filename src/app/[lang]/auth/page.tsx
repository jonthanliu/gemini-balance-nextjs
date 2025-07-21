export const runtime = "edge";

import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import LoginForm from "./LoginForm";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <LoginForm dictionary={dictionary.loginForm} />;
}
