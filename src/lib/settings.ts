import { prisma } from "./db";

// 定义默认配置
const defaultSettings = {
  ALLOWED_TOKENS: "",
  MAX_FAILURES: "3",
  PROXY_URL: "", // Optional proxy URL
  // Booleans are stored as strings "true" or "false"
  TOOLS_CODE_EXECUTION_ENABLED: "false",
  // JSON objects are stored as strings
  SAFETY_SETTINGS: JSON.stringify([
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ]),
  THINKING_BUDGET_MAP: JSON.stringify({}),
};

// Define a more specific type for settings to help with parsing
type ParsedSettings = {
  ALLOWED_TOKENS: string;
  MAX_FAILURES: number;
  PROXY_URL: string;
  TOOLS_CODE_EXECUTION_ENABLED: boolean;
  SAFETY_SETTINGS: { category: string; threshold: string }[];
  THINKING_BUDGET_MAP: { [key: string]: number };
};

type Settings = typeof defaultSettings;
let settingsCache: Settings | null = null;

/**
 * 获取所有配置项。
 * 优先从缓存读取，否则从数据库加载，并处理环境变量和默认值。
 */
export async function getSettings(): Promise<ParsedSettings> {
  // This function now returns a parsed object, not the raw string-based one.
  // Caching for the raw settings is still useful.
  if (settingsCache) {
    return parseSettings(settingsCache);
  }

  const settingsFromDb = await prisma.setting.findMany();
  const settingsMap = new Map(settingsFromDb.map((s) => [s.key, s.value]));

  const resolvedSettings: Settings = { ...defaultSettings };

  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    let value = settingsMap.get(key);

    if (value === undefined) {
      const envValue = process.env[key];
      if (envValue !== undefined) {
        value = envValue;
      } else {
        value = defaultSettings[key];
      }
    }
    resolvedSettings[key] = value;
  }

  settingsCache = resolvedSettings;
  return parseSettings(settingsCache);
}

function parseSettings(settings: Settings): ParsedSettings {
  return {
    ALLOWED_TOKENS: settings.ALLOWED_TOKENS,
    MAX_FAILURES: parseInt(settings.MAX_FAILURES, 10),
    PROXY_URL: settings.PROXY_URL,
    TOOLS_CODE_EXECUTION_ENABLED:
      settings.TOOLS_CODE_EXECUTION_ENABLED === "true",
    SAFETY_SETTINGS: JSON.parse(settings.SAFETY_SETTINGS),
    THINKING_BUDGET_MAP: JSON.parse(settings.THINKING_BUDGET_MAP),
  };
}

/**
 * 清空配置缓存，强制下次调用时重新从数据库加载。
 */
export function resetSettings(): void {
  settingsCache = null;
}

/**
 * 更新单个配置项。
 * @param key - 配置项的键
 * @param value - 配置项的值
 */
export async function updateSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  resetSettings(); // 更新后清空缓存
}
