import { getKeyManager } from "@/lib/key-manager";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const keyManager = await getKeyManager();
    await keyManager.checkAndReactivateKeys();
    return NextResponse.json({
      status: "ok",
      message: "Key health check completed.",
    });
  } catch (error: unknown) {
    console.error("[Cron Health Check Error]", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "error",
        message: "Key health check failed.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
