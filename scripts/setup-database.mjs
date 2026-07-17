import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({
  path: ".env.local",
  quiet: true,
});

const connectionString =
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DB_URL is missing from .env.local.",
  );
}

const schemaPath = path.join(
  process.cwd(),
  "supabase",
  "schema.sql",
);

const schema = await fs.readFile(
  schemaPath,
  "utf8",
);

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

try {
  await client.query("BEGIN");
  await client.query(schema);
  await client.query("COMMIT");

  console.log(
    "Supabase database schema is ready.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
