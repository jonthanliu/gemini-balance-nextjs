"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateMaxFailures(newMaxFailures: number) {
  if (typeof newMaxFailures !== "number" || newMaxFailures < 0) {
    return { error: "Invalid value for MAX_FAILURES" };
  }

  try {
    await prisma.setting.update({
      where: { key: "MAX_FAILURES" },
      data: { value: String(newMaxFailures) },
    });

    // Revalidate the admin page to show the new value
    revalidatePath("/admin");

    return { success: "Configuration updated successfully!" };
  } catch (error) {
    console.error("Failed to update MAX_FAILURES:", error);
    return { error: "Failed to update configuration." };
  }
}
