"use server";

"use server";

import { prisma } from "@/lib/db";
import { getKeyManager, resetKeyManager } from "@/lib/key-manager";
import { resetSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function addApiKeys(keysString: string) {
  if (!keysString) {
    return { error: "No API keys provided." };
  }

  const keys = keysString
    .split(/[\n,]+/) // Split by newlines or commas
    .map((key) => key.trim())
    .filter((key) => key && key.startsWith("AIza"));

  if (keys.length === 0) {
    return { error: "No valid API keys found in the input." };
  }

  const uniqueKeys = [...new Set(keys)];

  try {
    const existingKeys = await prisma.apiKey.findMany({
      where: {
        key: { in: uniqueKeys },
      },
    });
    const existingKeySet = new Set(existingKeys.map((k) => k.key));

    const newKeys = uniqueKeys.filter((key) => !existingKeySet.has(key));

    if (newKeys.length === 0) {
      return {
        error: "All provided keys already exist or were duplicates.",
      };
    }

    await prisma.apiKey.createMany({
      data: newKeys.map((key) => ({ key })),
    });

    resetKeyManager(); // Reset the singleton instance
    revalidatePath("/admin");
    return {
      success: `${newKeys.length} new API key(s) added successfully.`,
    };
  } catch (error) {
    console.error("Failed to add API keys:", error);
    return { error: "Failed to add API keys to the database." };
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

// Log Management Actions

type LogType = "request" | "error";

interface LogFilters {
  logType: LogType;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getLogs(filters: LogFilters) {
  const { logType, search, page = 1, limit = 10 } = filters;
  const where: any = {};

  if (search) {
    if (logType === "request") {
      where.apiKey = { contains: search };
    } else {
      where.OR = [
        { apiKey: { contains: search } },
        { errorType: { contains: search } },
        { errorMessage: { contains: search } },
      ];
    }
  }

  try {
    const model = logType === "request" ? prisma.requestLog : prisma.errorLog;
    const total = await (model as any).count({ where });
    const logs = await (model as any).findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { logs, total };
  } catch (error) {
    console.error(`Failed to fetch ${logType} logs:`, error);
    return { error: `Failed to fetch ${logType} logs.` };
  }
}

export async function deleteLogs(logIds: number[], logType: LogType) {
  try {
    const model = logType === "request" ? prisma.requestLog : prisma.errorLog;
    const response = await (model as any).deleteMany({
      where: { id: { in: logIds } },
    });
    revalidatePath("/admin");
    return { success: `${response.count} log(s) deleted.` };
  } catch (error) {
    console.error(`Failed to delete ${logType} logs:`, error);
    return { error: `Failed to delete ${logType} logs.` };
  }
}

export async function clearAllLogs(logType: LogType) {
  try {
    const model = logType === "request" ? prisma.requestLog : prisma.errorLog;
    await (model as any).deleteMany({});
    revalidatePath("/admin");
    return { success: `All ${logType} logs cleared.` };
  } catch (error) {
    console.error(`Failed to clear ${logType} logs:`, error);
    return { error: `Failed to clear ${logType} logs.` };
  }
}
