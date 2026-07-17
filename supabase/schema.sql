create extension if not exists pgcrypto;

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date,
  meeting_type text not null default 'online',
  status text not null default 'ready_for_review',
  raw_transcript text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_outputs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique
    references meetings(id) on delete cascade,
  short_summary text not null default '',
  detailed_summary jsonb not null default '{}'::jsonb,
  follow_up_email text not null default '',
  project_status_update text not null default '',
  open_questions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null
    references meetings(id) on delete cascade,
  title text not null,
  description text not null default '',
  owner_text text not null default 'Unassigned',
  deadline_text text not null default 'Not specified',
  priority text not null default 'unspecified',
  status text not null default 'To Do',
  source_timestamp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null
    references meetings(id) on delete cascade,
  text text not null,
  topic text not null default 'General',
  source_timestamp text,
  created_at timestamptz not null default now()
);

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

create index if not exists meetings_created_at_idx
  on meetings(created_at desc);

create index if not exists tasks_meeting_id_idx
  on tasks(meeting_id);

create index if not exists decisions_meeting_id_idx
  on decisions(meeting_id);

create index if not exists speaker_segments_meeting_id_idx
  on speaker_segments(meeting_id);

create index if not exists email_send_logs_meeting_id_idx
  on email_send_logs(meeting_id);

alter table meetings enable row level security;
alter table generated_outputs enable row level security;
alter table tasks enable row level security;
alter table decisions enable row level security;
alter table people enable row level security;
alter table voice_profiles enable row level security;
alter table speaker_segments enable row level security;
alter table email_send_logs enable row level security;
