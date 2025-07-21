import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { getSettings } from "@/lib/settings";
import { ConfigForm } from "../ConfigForm";

export const runtime = "edge";
export const revalidate = 0; // Disable caching

export default async function ConfigPage({
  params: paramsPromise,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await paramsPromise;
  const dictionary = await getDictionary(lang);
  const settings = await getSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.config.form.title}</CardTitle>
        <CardDescription>{dictionary.config.form.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfigForm settings={settings} dictionary={dictionary.config.form} />
      </CardContent>
    </Card>
  );
}
