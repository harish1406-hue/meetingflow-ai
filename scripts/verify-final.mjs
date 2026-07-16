import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: ".env.local",
  quiet: true,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const tables = [
  "meetings",
  "generated_outputs",
  "tasks",
  "decisions",
  "people",
  "voice_profiles",
  "speaker_segments",
  "email_send_logs",
];

let failed = false;

for (const table of tables) {
  const { error } = await supabase
    .from(table)
    .select("*")
    .limit(1);

  if (error) {
    failed = true;
    console.error(`FAIL ${table}: ${error.message}`);
  } else {
    console.log(`PASS ${table}`);
  }
}

const { data: demos, error } = await supabase
  .from("meetings")
  .select("id,title")
  .like("title", "[Demo]%");

if (error || (demos || []).length < 3) {
  failed = true;
  console.error(
    "FAIL: Three demo meetings were not found.",
  );
} else {
  console.log(
    `PASS demo meetings: ${demos.length}`,
  );
}

if (failed) {
  process.exit(1);
}

console.log("Final verification passed.");