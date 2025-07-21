import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { getKeyManager } from "@/lib/key-manager";
import { getKeyStats, getSystemStats } from "./actions";
import { AddKeyDialog } from "./AddKeyDialog";
import { DashboardStats } from "./DashboardStats";
import { KeyList } from "./KeyList";

export const runtime = "edge";
export const revalidate = 0; // Disable caching

export default async function AdminPage({
  params: paramsPromise,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await paramsPromise;
  const dictionary = await getDictionary(lang);

  // Fetch all data in parallel
  const [keyManager, keyStats, systemStats] = await Promise.all([
    getKeyManager(),
    getKeyStats(),
    getSystemStats(),
  ]);

  const keys = keyManager.getAllKeys();

  // Handle potential errors from stats fetching
  const safeKeyStats = {
    total: keyStats.total ?? 0,
    enabled: keyStats.enabled ?? 0,
    invalid: keyStats.invalid ?? 0,
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{dictionary.dashboard.title}</h1>

      <DashboardStats
        keyStats={safeKeyStats}
        systemStats={systemStats}
        dictionary={{
          ...dictionary.dashboard,
          keyDetails: dictionary.keyDetails,
          apiCallDetails: dictionary.apiCallDetails,
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{dictionary.keys.title}</CardTitle>
            <CardDescription>{dictionary.keys.description}</CardDescription>
          </div>
          <AddKeyDialog dictionary={dictionary.keys} />
        </CardHeader>
        <CardContent>
          <KeyList keys={keys} dictionary={dictionary.keys.table} />
        </CardContent>
      </Card>
    </div>
  );
}
