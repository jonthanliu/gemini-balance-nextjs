import type { D1Database } from "@cloudflare/workers-types";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import "server-only";

declare global {
  // allow global `var` declarations
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  if (!process.env.D1_DATABASE) {
    throw new Error("D1_DATABASE environment variable is not set");
  }

  const adapter = new PrismaD1(
    process.env.D1_DATABASE as unknown as D1Database
  );
  return new PrismaClient({ adapter });
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
