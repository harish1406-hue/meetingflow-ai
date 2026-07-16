import dotenv from "dotenv";
import pg from "pg";

dotenv.config({
  path: ".env.local",
});

const connectionString =
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DB_URL is missing.",
  );
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

try {
  await client.query(`
    create extension if not exists pgcrypto;

    create table if not exists people (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text,
      role text,
      voice_profile_status text not null default 'none',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_matched_at timestamptz
    );

    create table if not exists voice_profiles (
      id uuid primary key default gen_random_uuid(),
      person_id uuid not null unique
        references people(id) on delete cascade,
      profile_type text not null,
      profile_data text not null,
      consent_status text not null default 'confirmed',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz
    );

    create table if not exists speaker_segments (
      id uuid primary key default gen_random_uuid(),
      meeting_id uuid not null
        references meetings(id) on delete cascade,
      speaker_label text not null,
      person_id uuid
        references people(id) on delete set null,
      start_time_ms bigint not null,
      end_time_ms bigint not null,
      text text not null default '',
      confidence real,
      created_at timestamptz not null default now()
    );

    create table if not exists email_send_logs (
      id uuid primary key default gen_random_uuid(),
      meeting_id uuid not null
        references meetings(id) on delete cascade,
      recipient_email text not null,
      subject text not null,
      sent_at timestamptz not null default now(),
      status text not null,
      provider_message_id text,
      error_message text
    );

    alter table people enable row level security;
    alter table voice_profiles enable row level security;
    alter table speaker_segments enable row level security;
    alter table email_send_logs enable row level security;
  `);

  console.log(
    "Remaining database tables are ready.",
  );
} finally {
  await client.end();
}
