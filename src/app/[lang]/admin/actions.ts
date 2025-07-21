"use server";

import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/get-dictionary";
import { getLocale } from "@/lib/get-locale";
import { getKeyManager, resetKeyManager } from "@/lib/key-manager";
import { ParsedSettings, resetSettings } from "@/lib/settings";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

type Stats = {
  total: { total: number; failed: number };
  "1m": { total: number; failed: number };
  "1h": { total: number; failed: number };
  "24h": { total: number; failed: number };
};

export async function addApiKeys(keysString: string) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.addDialog;

  if (!keysString) {
    return { error: t.error.noKeys };
  }

  // 1. Process the input string into a clean list of potential keys
  const allSubmittedKeys = keysString
    .split(/[\n,]+/) // Split by newlines or commas
    .map((key) => key.trim())
    .filter(Boolean); // Filter out any empty strings

  if (allSubmittedKeys.length === 0) {
    return { error: t.error.noKeysInInput };
  }

  // 2. Remove duplicates from the user's input
  const uniqueSubmittedKeys = [...new Set(allSubmittedKeys)];

  try {
    // 3. Find which of the submitted keys already exist in the database
    const existingKeys = await prisma.apiKey.findMany({
      where: {
        key: { in: uniqueSubmittedKeys },
      },
      select: { key: true }, // Only select the key field
    });
    const existingKeySet = new Set(existingKeys.map((k) => k.key));

    // 4. Determine which keys are genuinely new
    const newKeysToAdd = uniqueSubmittedKeys.filter(
      (key) => !existingKeySet.has(key)
    );

    let message = "";

    // 5. Add the new keys if there are any
    if (newKeysToAdd.length > 0) {
      await prisma.apiKey.createMany({
        data: newKeysToAdd.map((key) => ({ key })),
      });
      message += t.success.added.replace(
        "{count}",
        newKeysToAdd.length.toString()
      );
      resetKeyManager(); // Invalidate the key manager cache
      revalidatePath("/admin"); // Revalidate the page to show new keys
    } else {
      message += t.info.noNewKeys;
    }

    // 6. Report back on duplicates
    const duplicateCount = uniqueSubmittedKeys.length - newKeysToAdd.length;
    if (duplicateCount > 0) {
      message +=
        " " + t.info.duplicates.replace("{count}", duplicateCount.toString());
    }

    return { success: message.trim() };
  } catch (_error) {
    console.error("Failed to add API keys:", _error);
    return { error: t.error.failedToAdd };
  }
}

export async function deleteApiKeys(keys: string[]) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table;

  if (!keys || keys.length === 0) {
    return { error: t.error.noKeysForDeletion };
  }
  try {
    const deleteResponse = await prisma.apiKey.deleteMany({
      where: { key: { in: keys } },
    });
    resetKeyManager(); // Reset the singleton instance
    revalidatePath("/admin");
    return {
      success: t.success.deleted.replace(
        "{count}",
        deleteResponse.count.toString()
      ),
    };
  } catch {
    return { error: t.error.failedToDelete };
  }
}

export async function resetKeysFailures(keys: string[]) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table;

  if (!keys || keys.length === 0) {
    return { error: t.error.noKeysForReset };
  }
  try {
    const keyManager = await getKeyManager();
    keys.forEach((key) => keyManager.resetKeyFailureCount(key));
    revalidatePath("/admin");
    return {
      success: t.success.reset.replace("{count}", keys.length.toString()),
    };
  } catch {
    return { error: t.error.failedToReset };
  }
}

export async function verifyApiKeys(keys: string[]) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table;

  if (!keys || keys.length === 0) {
    return { error: t.error.noKeysForVerification };
  }
  try {
    const keyManager = await getKeyManager();
    const results = await Promise.all(
      keys.map(async (key) => {
        const success = await keyManager.verifyKey(key);
        return { key, success };
      })
    );
    revalidatePath("/admin");
    return { success: t.success.verificationCompleted, results };
  } catch {
    return { error: t.error.failedToVerify };
  }
}

export async function getKeyUsageDetails(apiKey: string) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.keys.table.usage;

  try {
    // In the DB, we only store the full API key, not the slice.
    // The original code had a bug where it was searching by the slice.
    const where = { apiKey: apiKey };

    const totalCalls = await prisma.requestLog.count({ where });
    const successfulCalls = await prisma.requestLog.count({
      where: { ...where, isSuccess: true },
    });
    const failedCalls = totalCalls - successfulCalls;

    const recentLogs = await prisma.requestLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50, // Get last 50 logs
    });

    return {
      stats: {
        total: totalCalls,
        success: successfulCalls,
        failed: failedCalls,
      },
      logs: recentLogs,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to fetch key usage details for ${apiKey}:`, error);
    return {
      stats: { total: 0, success: 0, failed: 0 },
      logs: [],
      error: t.error,
    };
  }
}

export async function updateSetting(key: string, value: string) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.config.form;

  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    resetSettings(); // 清空配置缓存
    revalidatePath("/admin"); // 重新验证管理页面

    return { success: t.success.updated };
  } catch (error) {
    console.error(`Failed to update setting ${key}:`, error);
    return { error: t.error.failedToUpdate };
  }
}

export async function updateSettings(settings: ParsedSettings) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.config.form;

  try {
    const settingsToUpdate: Omit<ParsedSettings, "AUTH_TOKEN"> & {
      AUTH_TOKEN?: string;
    } = { ...settings };

    // Handle AUTH_TOKEN separately
    if (settings.AUTH_TOKEN) {
      const hashedToken = await bcrypt.hash(settings.AUTH_TOKEN, 10);
      settingsToUpdate.AUTH_TOKEN = hashedToken;
    } else {
      // If the token is empty, we don't update it.
      delete settingsToUpdate.AUTH_TOKEN;
    }

    const updates = Object.entries(settingsToUpdate).map(([key, value]) => {
      let dbValue: string;
      if (typeof value === "boolean") {
        dbValue = value.toString();
      } else if (typeof value === "number") {
        dbValue = value.toString();
      } else if (typeof value === "object") {
        dbValue = JSON.stringify(value);
      } else {
        dbValue = value as string;
      }
      return prisma.setting.upsert({
        where: { key },
        update: { value: dbValue },
        create: { key, value: dbValue },
      });
    });

    await prisma.$transaction(updates);

    resetSettings();
    resetKeyManager(); // Also reset key manager in case MAX_FAILURES changed
    revalidatePath("/admin/config");
    revalidatePath("/admin");

    return { success: t.success.updated };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { error: t.error.failedToUpdate };
  }
}

export async function getKeyStats() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const totalKeys = await prisma.apiKey.count();
    const enabledKeys = await prisma.apiKey.count({
      where: { enabled: true },
    });
    // The proposal mentions "invalid" keys. In our schema, this corresponds to keys that are NOT enabled.
    // This could be because they failed health checks or were manually disabled.
    const invalidKeys = totalKeys - enabledKeys;

    return {
      total: totalKeys,
      enabled: enabledKeys,
      invalid: invalidKeys,
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch key stats:", error);
    return {
      total: 0,
      enabled: 0,
      invalid: 0,
      error: t.error.failedToFetchKeyStats,
    };
  }
}

export async function getApiCallStats() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const callsLastMinute = await prisma.requestLog.count({
      where: { createdAt: { gte: oneMinuteAgo } },
    });

    const callsLastHour = await prisma.requestLog.count({
      where: { createdAt: { gte: oneHourAgo } },
    });

    const callsLast24Hours = await prisma.requestLog.count({
      where: { createdAt: { gte: twentyFourHoursAgo } },
    });

    return {
      lastMinute: callsLastMinute,
      lastHour: callsLastHour,
      last24Hours: callsLast24Hours,
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch API call stats:", error);
    return {
      lastMinute: 0,
      lastHour: 0,
      last24Hours: 0,
      error: t.error.failedToFetchApiCallStats,
    };
  }
}

export async function getDetailedKeyStats() {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const allKeys = await prisma.apiKey.findMany({
      select: {
        key: true,
        enabled: true,
        failCount: true,
        createdAt: true,
        lastUsed: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { allKeys, error: null };
  } catch (error) {
    console.error("Failed to fetch detailed key stats:", error);
    return {
      allKeys: [],
      error: t.error.failedToFetchDetailedKeyStats,
    };
  }
}

type TimeFrame = "1m" | "1h" | "24h";

export async function getDetailedApiCallStats(timeframe: TimeFrame) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.dashboard;

  try {
    const now = new Date();
    let gte: Date;

    switch (timeframe) {
      case "1m":
        gte = new Date(now.getTime() - 1 * 60 * 1000);
        break;
      case "1h":
        gte = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        gte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const recentLogs = await prisma.requestLog.findMany({
      where: { createdAt: { gte } },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to the last 100 logs for performance
    });

    const total = await prisma.requestLog.count({
      where: { createdAt: { gte } },
    });
    const success = await prisma.requestLog.count({
      where: { createdAt: { gte }, isSuccess: true },
    });
    const failed = total - success;

    return { logs: recentLogs, stats: { total, success, failed }, error: null };
  } catch (error) {
    console.error(
      `Failed to fetch detailed API call stats for ${timeframe}:`,
      error
    );
    return {
      logs: [],
      stats: { total: 0, success: 0, failed: 0 },
      error: t.error.failedToFetchDetailedApiCallStats,
    };
  }
}

// Log Management Actions

type LogType = "request" | "error";

interface LogFilters {
  logType: LogType;
  page?: number;
  limit?: number;
  apiKey?: string;
  errorType?: string;
  errorCode?: string;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
}

type RequestLogWhere = import("@prisma/client").Prisma.RequestLogWhereInput;
type ErrorLogWhere = import("@prisma/client").Prisma.ErrorLogWhereInput;

export async function getLogs(filters: LogFilters) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.logs;

  const {
    logType,
    page = 1,
    limit = 15,
    apiKey,
    errorType,
    errorCode,
    startDate,
    endDate,
  } = filters;

  try {
    if (logType === "request") {
      const where: RequestLogWhere = {};
      if (apiKey) where.apiKey = { contains: apiKey };
      if (errorCode) where.statusCode = { equals: parseInt(errorCode, 10) };

      const createdAtFilter: { gte?: Date; lte?: Date } = {};
      if (startDate) createdAtFilter.gte = new Date(startDate);
      if (endDate) createdAtFilter.lte = new Date(endDate);
      if (Object.keys(createdAtFilter).length > 0) {
        where.createdAt = createdAtFilter;
      }

      const total = await prisma.requestLog.count({ where });
      const logs = await prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { logs, total, error: null };
    } else {
      const where: ErrorLogWhere = {};
      if (apiKey) where.apiKey = { contains: apiKey };
      if (errorType) where.errorType = { contains: errorType };
      if (errorCode)
        where.errorMessage = { contains: `status_code=${errorCode}` };

      const createdAtFilter: { gte?: Date; lte?: Date } = {};
      if (startDate) createdAtFilter.gte = new Date(startDate);
      if (endDate) createdAtFilter.lte = new Date(endDate);
      if (Object.keys(createdAtFilter).length > 0) {
        where.createdAt = createdAtFilter;
      }

      const total = await prisma.errorLog.count({ where });
      const logs = await prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { logs, total, error: null };
    }
  } catch (_error) {
    const errorMessage = t.error.failedToFetch.replace("{logType}", logType);
    console.error(errorMessage, _error);
    return { logs: [], total: 0, error: errorMessage };
  }
}

export async function deleteLogs(logIds: number[], logType: LogType) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.logs;

  try {
    let response;
    if (logType === "request") {
      response = await prisma.requestLog.deleteMany({
        where: { id: { in: logIds } },
      });
    } else {
      response = await prisma.errorLog.deleteMany({
        where: { id: { in: logIds } },
      });
    }
    revalidatePath("/admin");
    return {
      success: t.success.deleted.replace("{count}", response.count.toString()),
    };
  } catch (_error) {
    console.error(`Failed to delete ${logType} logs:`, _error);
    return { error: t.error.failedToDelete.replace("{logType}", logType) };
  }
}

export async function clearAllLogs(logType: LogType) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.logs;

  try {
    if (logType === "request") {
      await prisma.requestLog.deleteMany({});
    } else {
      await prisma.errorLog.deleteMany({});
    }
    revalidatePath("/admin");
    return { success: t.success.cleared.replace("{logType}", logType) };
  } catch (_error) {
    console.error(`Failed to clear ${logType} logs:`, _error);
    return { error: t.error.failedToClear.replace("{logType}", logType) };
  }
}

async function getStats(apiKey?: string): Promise<Stats> {
  const where = apiKey ? { apiKey } : {};
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const queries = [
      prisma.requestLog.count({
        where: { ...where, createdAt: { gte: oneMinuteAgo } },
      }),
      prisma.requestLog.count({
        where: { ...where, createdAt: { gte: oneMinuteAgo }, isSuccess: false },
      }),
      prisma.requestLog.count({
        where: { ...where, createdAt: { gte: oneHourAgo } },
      }),
      prisma.requestLog.count({
        where: { ...where, createdAt: { gte: oneHourAgo }, isSuccess: false },
      }),
      prisma.requestLog.count({
        where: { ...where, createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.requestLog.count({
        where: {
          ...where,
          createdAt: { gte: twentyFourHoursAgo },
          isSuccess: false,
        },
      }),
    ];

    queries.unshift(
      prisma.requestLog.count({ where }),
      prisma.requestLog.count({ where: { ...where, isSuccess: false } })
    );

    const results = await Promise.all(queries);

    const [
      totalCalls,
      totalFailed,
      callsLastMinute,
      failedLastMinute,
      callsLastHour,
      failedLastHour,
      callsLast24Hours,
      failedLast24Hours,
    ] = results;
    return {
      total: { total: totalCalls, failed: totalFailed },
      "1m": { total: callsLastMinute, failed: failedLastMinute },
      "1h": { total: callsLastHour, failed: failedLastHour },
      "24h": { total: callsLast24Hours, failed: failedLast24Hours },
    };
  } catch (error) {
    console.error(
      `Failed to fetch stats${apiKey ? ` for key ${apiKey}` : ""}:`,
      error
    );
    const emptyStats = {
      total: { total: 0, failed: 0 },
      "1m": { total: 0, failed: 0 },
      "1h": { total: 0, failed: 0 },
      "24h": { total: 0, failed: 0 },
    };
    return emptyStats;
  }
}

export async function getSystemStats() {
  return getStats();
}

export async function getApiKeyStats(apiKey: string) {
  return getStats(apiKey);
}
