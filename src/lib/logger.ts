// src/lib/logger.ts

// A simple console logger that mimics the Pino API for compatibility.
// This version is Edge Runtime compatible and does not require nodejs_compat flag.

const logger = {
  info: (...args: unknown[]) => {
    console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    // You can disable debug logs in production if needed
    if (process.env.NODE_ENV !== "production") {
      console.debug(...args);
    }
  },
};

export default logger;
