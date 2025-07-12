import { cycle } from "itertools";
import { prisma } from "./db";
import logger from "./logger";
import { getSettings } from "./settings";

/**
 * Manages a pool of API keys, providing round-robin selection,
 * failure tracking, and automatic recovery.
 */
export class KeyManager {
  private keys: readonly string[];
  private keyCycle: IterableIterator<string>;
  private failureCounts: Map<string, number>;
  private readonly maxFailures: number;

  constructor(keys: string[], maxFailures: number = 3) {
    if (!keys || keys.length === 0) {
      throw new Error(
        "KeyManager must be initialized with at least one API key from the database."
      );
    }
    this.keys = Object.freeze([...keys]);
    this.keyCycle = cycle(this.keys);
    this.failureCounts = new Map(this.keys.map((key) => [key, 0]));
    this.maxFailures = maxFailures;
    logger.info(
      `KeyManager initialized with ${this.keys.length} keys from database.`
    );
  }

  public isKeyValid(key: string): boolean {
    const failures = this.failureCounts.get(key);
    return failures !== undefined && failures < this.maxFailures;
  }

  public getNextWorkingKey(): string {
    if (this.keys.length === 0) {
      throw new Error("No API keys available in the key manager.");
    }
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keyCycle.next().value;
      if (this.isKeyValid(key)) {
        return key;
      }
    }
    throw new Error(
      "All API keys are currently failing. Please check their validity or reset failure counts."
    );
  }

  public handleApiFailure(key: string): void {
    if (this.failureCounts.has(key)) {
      const currentFailures = this.failureCounts.get(key)!;
      this.failureCounts.set(key, currentFailures + 1);
      logger.warn(
        { key: `...${key.slice(-4)}`, failures: currentFailures + 1 },
        `Failure recorded for key.`
      );
    }
  }

  public resetKeyFailureCount(key: string): void {
    if (this.failureCounts.has(key)) {
      this.failureCounts.set(key, 0);
      logger.info(
        { key: `...${key.slice(-4)}` },
        `Failure count reset for key.`
      );
    }
  }

  public getAllKeys(): {
    key: string;
    failCount: number;
    isWorking: boolean;
  }[] {
    return this.keys.map((key) => {
      const failCount = this.failureCounts.get(key)!;
      return {
        key,
        failCount,
        isWorking: this.isKeyValid(key),
      };
    });
  }
}

// --- Singleton Instance ---

let keyManagerPromise: Promise<KeyManager> | null = null;

export function resetKeyManager() {
  keyManagerPromise = null;
}

const getKeysFromEnv = (): string[] => {
  const keysEnv = process.env.GEMINI_API_KEYS;
  if (!keysEnv) {
    return [];
  }
  return keysEnv
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
};

async function createKeyManager(): Promise<KeyManager> {
  // 1. Sync keys from environment to database
  const keysFromEnv = getKeysFromEnv();
  if (keysFromEnv.length > 0) {
    const keysInDb = await prisma.apiKey.findMany();
    const keysToCreate = keysFromEnv.filter(
      (envKey) => !keysInDb.some((dbKey) => dbKey.key === envKey)
    );

    if (keysToCreate.length > 0) {
      await prisma.apiKey.createMany({
        data: keysToCreate.map((key) => ({ key })),
      });
      logger.info(
        `Synced ${keysToCreate.length} new keys from environment to database.`
      );
    }
  }

  // 2. Load all keys from the database to be used at runtime
  const allDbKeys = await prisma.apiKey.findMany();
  const apiKeys = allDbKeys.map((k) => k.key);

  // 3. Load settings using the settings service
  const settings = await getSettings();
  const maxFailures = parseInt(settings.MAX_FAILURES, 10);

  return new KeyManager(apiKeys, maxFailures);
}

/**
 * Returns the singleton instance of the KeyManager.
 */
export function getKeyManager(): Promise<KeyManager> {
  if (!keyManagerPromise) {
    keyManagerPromise = createKeyManager();
  }
  return keyManagerPromise;
}
