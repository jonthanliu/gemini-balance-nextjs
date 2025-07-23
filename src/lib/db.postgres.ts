import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./db/schema";
import "./envConfig";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

export const db = drizzle(client, { schema });
