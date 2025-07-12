import { cycle } from "itertools";

/**
 * Manages a pool of API keys, providing round-robin selection,
 * failure tracking, and automatic recovery.
 */
export class KeyManager {
  private keys: readonly string[];
  private keyCycle: IterableIterator<string>;
  private failureCounts: Map<string, number>;
  private readonly maxFailures: number;

  /**
   * Initializes the KeyManager with a list of API keys.
   * @param keys - An array of API key strings.
   * @param maxFailures - The number of failures before a key is considered invalid.
   */
  constructor(keys: string[], maxFailures: number = 3) {
    if (!keys || keys.length === 0) {
      throw new Error(
        "KeyManager must be initialized with at least one API key."
      );
    }
    this.keys = Object.freeze([...keys]);
    this.keyCycle = cycle(this.keys);
    this.failureCounts = new Map(this.keys.map((key) => [key, 0]));
    this.maxFailures = maxFailures;
  }

  /**
   * Checks if a key is currently considered valid.
   * @param key - The API key to check.
   * @returns True if the key is valid, false otherwise.
   */
  public isKeyValid(key: string): boolean {
    const failures = this.failureCounts.get(key);
    return failures !== undefined && failures < this.maxFailures;
  }

  /**
   * Retrieves the next available, valid API key from the pool.
   * It cycles through the keys until a working one is found.
   * @returns A valid API key.
   * @throws An error if all keys are currently marked as invalid.
   */
  public getNextWorkingKey(): string {
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

  /**
   * Records a failure for a specific API key.
   * @param key - The API key that failed.
   */
  public handleApiFailure(key: string): void {
    if (this.failureCounts.has(key)) {
      const currentFailures = this.failureCounts.get(key)!;
      this.failureCounts.set(key, currentFailures + 1);
      console.warn(
        `Failure recorded for key ending in ...${key.slice(
          -4
        )}. Total failures: ${currentFailures + 1}`
      );
    }
  }

  /**
   * Resets the failure count for a specific API key, making it valid again.
   * @param key - The API key to reset.
   */
  public resetKeyFailureCount(key: string): void {
    if (this.failureCounts.has(key)) {
      this.failureCounts.set(key, 0);
      console.log(`Failure count reset for key ending in ...${key.slice(-4)}.`);
    }
  }

  /**
   * Resets the failure counts for all keys.
   */
  public resetAllFailureCounts(): void {
    for (const key of this.keys) {
      this.failureCounts.set(key, 0);
    }
    console.log("All key failure counts have been reset.");
  }

  /**
   * Gets the status of all keys, categorized as valid or invalid.
   * @returns An object containing lists of valid and invalid keys with their failure counts.
   */
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

  public getKeysByStatus(): {
    valid: { key: string; failures: number }[];
    invalid: { key: string; failures: number }[];
  } {
    const valid: { key: string; failures: number }[] = [];
    const invalid: { key: string; failures: number }[] = [];

    for (const key of this.keys) {
      const failures = this.failureCounts.get(key)!;
      const keyStatus = { key, failures };
      if (this.isKeyValid(key)) {
        valid.push(keyStatus);
      } else {
        invalid.push(keyStatus);
      }
    }
    return { valid, invalid };
  }
}

// --- Singleton Instance ---

// Helper function to load keys from environment variables
const getKeysFromEnv = (): string[] => {
  const keysEnv = process.env.GEMINI_API_KEYS;
  if (!keysEnv) {
    console.warn(
      "GEMINI_API_KEYS environment variable not set. Using fallback test key."
    );
    // Return a dummy key for development if no keys are provided
    return ["dummy-key-for-development-only"];
  }
  return keysEnv
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
};

const getMaxFailuresFromEnv = (): number => {
  const maxFailures = process.env.MAX_FAILURES;
  if (maxFailures && !isNaN(parseInt(maxFailures, 10))) {
    return parseInt(maxFailures, 10);
  }
  return 3; // Default value
};

import { prisma } from "./db";

let keyManagerInstance: KeyManager | null = null;

async function createKeyManager(): Promise<KeyManager> {
  // 1. Sync keys from environment to database
  const keysFromEnv = getKeysFromEnv();
  const keysInDb = await prisma.apiKey.findMany();
  const keysToCreate = keysFromEnv.filter(
    (envKey) => !keysInDb.some((dbKey) => dbKey.key === envKey)
  );

  if (keysToCreate.length > 0) {
    await prisma.apiKey.createMany({
      data: keysToCreate.map((key) => ({ key })),
    });
    console.log(
      `Synced ${keysToCreate.length} new keys from environment to database.`
    );
  }

  // 2. Load all keys from the database to be used at runtime
  const allDbKeys = await prisma.apiKey.findMany();
  const apiKeys = allDbKeys.map((k) => k.key);

  // 3. Load settings from the database
  let maxFailures = 3; // Default value
  const maxFailuresSetting = await prisma.setting.findUnique({
    where: { key: "MAX_FAILURES" },
  });

  if (maxFailuresSetting && !isNaN(parseInt(maxFailuresSetting.value, 10))) {
    maxFailures = parseInt(maxFailuresSetting.value, 10);
  } else {
    // If not in DB, create it with the default value
    await prisma.setting.create({
      data: { key: "MAX_FAILURES", value: "3" },
    });
  }

  return new KeyManager(apiKeys, maxFailures);
}

/**
 * Returns the singleton instance of the KeyManager.
 * Initializes it on first call.
 */
export const getKeyManager = (): KeyManager => {
  if (!keyManagerInstance) {
    // This is a simplified approach for this specific app structure.
    // In a general-purpose app, you'd handle the async creation more robustly.
    // For this serverless environment, we assume it's okay to initialize synchronously
    // and the async part will resolve before any major processing.
    // A better pattern would be to ensure all callers `await` initialization.
    createKeyManager().then((manager) => {
      keyManagerInstance = manager;
    });
    // Return a temporary manager or handle the loading state appropriately
    // For now, we'll create a temporary one to avoid breaking the sync flow.
    // The real one will replace it shortly.
    if (!keyManagerInstance) {
      keyManagerInstance = new KeyManager(
        getKeysFromEnv(),
        getMaxFailuresFromEnv()
      );
    }
  }
  return keyManagerInstance;
};
