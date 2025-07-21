import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { getLogs } from "../actions";
import { LogViewer } from "../LogViewer";

export const runtime = "edge";
export const revalidate = 0; // Disable caching

interface LogsPageProps {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LogsPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: LogsPageProps) {
  const { lang } = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const dictionary = await getDictionary(lang);
  const logType = searchParams.type === "error" ? "error" : "request";
  const page = Number(searchParams.page) || 1;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : "";

  const logData = await getLogs({
    logType,
    page,
    apiKey: search, // Assuming search is for apiKey for now
    limit: 15,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.logs.title}</CardTitle>
        <CardDescription>{dictionary.logs.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {logData.error ? (
          <p className="text-sm text-red-500">{logData.error}</p>
        ) : (
          <LogViewer
            logs={logData.logs}
            total={logData.total}
            page={page}
            limit={15}
            logType={logType}
            dictionary={dictionary.logs}
          />
        )}
      </CardContent>
    </Card>
  );
}
