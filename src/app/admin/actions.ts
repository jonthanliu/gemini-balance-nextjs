"use server";

"use server";

import { prisma } from "@/lib/db";
import { getKeyManager, resetKeyManager } from "@/lib/key-manager";
import { resetSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function addApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith("AIza")) {
    return { error: "Invalid API key format." };
  }
  try {
    await prisma.apiKey.create({ data: { key: apiKey } });
    resetKeyManager(); // Reset the singleton instance
    revalidatePath("/admin");
    return { success: "API key added successfully." };
  } catch (error) {
    return { error: "Failed to add API key (it might already exist)." };
  }
}

export async function deleteApiKeys(keys: string[]) {
  if (!keys || keys.length === 0) {
    return { error: "No keys provided for deletion." };
  }
  try {
    const deleteResponse = await prisma.apiKey.deleteMany({
      where: { key: { in: keys } },
    });
    resetKeyManager(); // Reset the singleton instance
    revalidatePath("/admin");
    return {
      success: `${deleteResponse.count} API key(s) deleted successfully.`,
    };
  } catch (error) {
    return { error: "Failed to delete API keys." };
  }
}

export async function resetKeysFailures(keys: string[]) {
  if (!keys || keys.length === 0) {
    return { error: "No keys provided for reset." };
  }
  try {
    const keyManager = await getKeyManager();
    keys.forEach((key) => keyManager.resetKeyFailureCount(key));
    revalidatePath("/admin");
    return {
      success: `${keys.length} key(s) failure count reset successfully.`,
    };
  } catch (error) {
    return { error: "Failed to reset key failure counts." };
  }
}

export async function getKeyUsageDetails(apiKey: string) {
  try {
    const totalCalls = await prisma.requestLog.count({
      where: { apiKey: apiKey.slice(-4) },
    });
    const successfulCalls = await prisma.requestLog.count({
      where: { apiKey: apiKey.slice(-4), isSuccess: true },
    });
    const failedCalls = totalCalls - successfulCalls;

    return {
      total: totalCalls,
      success: successfulCalls,
      failed: failedCalls,
    };
  } catch (error) {
    return { error: "Failed to fetch key usage details." };
  }
}

export async function updateSetting(key: string, value: string) {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    resetSettings(); // 清空配置缓存
    revalidatePath("/admin"); // 重新验证管理页面

    return { success: "Configuration updated successfully!" };
  } catch (error) {
    console.error(`Failed to update setting ${key}:`, error);
    return { error: "Failed to update configuration." };
  }
}
