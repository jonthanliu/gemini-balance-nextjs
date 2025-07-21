import type { D1Database } from "@cloudflare/workers-types";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import "server-only";

declare global {
  // allow global `var` declarations
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  // At runtime on Cloudflare, `process.env.D1_DATABASE` is an object (the binding).
  // During the `next build` process, it is either undefined or a string.
  // This check ensures we only use the D1 adapter when the binding is actually available.
  if (typeof process.env.D1_DATABASE === "object") {
    const adapter = new PrismaD1(
      process.env.D1_DATABASE as unknown as D1Database
    );
    return new PrismaClient({ adapter });
  }

  // Fallback for local development or for the `next build` process.
  // This will use the `DATABASE_URL` from the .env file or the build environment variables.
  return new PrismaClient();
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
