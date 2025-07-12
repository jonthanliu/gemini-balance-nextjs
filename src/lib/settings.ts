import { prisma } from "./db";

// 定义默认配置
const defaultSettings = {
  ALLOWED_TOKENS: "", // 默认允许所有令牌，以逗号分隔
  MAX_FAILURES: "5", // 默认最大失败次数
};

type Settings = typeof defaultSettings;
let settingsCache: Settings | null = null;

/**
 * 获取所有配置项。
 * 优先从缓存读取，否则从数据库加载，并处理环境变量和默认值。
 */
export async function getSettings(): Promise<Settings> {
  if (settingsCache) {
    return settingsCache;
  }

  const settingsFromDb = await prisma.setting.findMany();
  const settingsMap = new Map(settingsFromDb.map((s) => [s.key, s.value]));

  const resolvedSettings: Settings = { ...defaultSettings };

  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    let value = settingsMap.get(key);

    if (value === undefined) {
      // 数据库中不存在，尝试从环境变量读取
      const envValue = process.env[key];
      if (envValue !== undefined) {
        value = envValue;
      } else {
        // 环境变量中也不存在，使用硬编码的默认值
        value = defaultSettings[key];
      }
      // 在只读环境中，我们不应该尝试写入数据库。
      // 写入操作应仅通过管理后台的 Server Action 进行。
    }
    resolvedSettings[key] = value;
  }

  settingsCache = resolvedSettings;
  return settingsCache;
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
