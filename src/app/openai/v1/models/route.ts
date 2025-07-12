import { getKeyManager } from "@/lib/key-manager";
import { NextResponse } from "next/server";

const GOOGLE_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function GET() {
  try {
    const keyManager = await getKeyManager();
    const apiKey = keyManager.getNextWorkingKey();

    const response = await fetch(
      `${GOOGLE_API_URL}?key=${apiKey}&pageSize=1000`
    );

    if (!response.ok) {
      throw new Error(`Google API failed with status: ${response.status}`);
    }

    const googleModels = await response.json();

    const openAIFormattedModels = {
      object: "list",
      data: googleModels.models.map((model: any) => ({
        id: model.name.replace("models/", ""),
        object: "model",
        created: Date.now(),
        owned_by: "google",
      })),
    };

    return NextResponse.json(openAIFormattedModels);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models from Google AI." },
      { status: 500 }
    );
  }
}
