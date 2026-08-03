-- TournamentTracker schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── Users ───────────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  username text not null unique,
  pin text not null,
  role text not null check (role in ('super_admin','client_admin','data_collector')),
  display_name text not null,
  created_at timestamptz default now()
);

-- ── Clients ─────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- ── Events ──────────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz default now()
);

-- ── Teams ───────────────────────────────────────────────────
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  color text not null default '#888888',
  created_at timestamptz default now()
);

-- ── Editions ────────────────────────────────────────────────
create table if not exists editions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  date text not null default '',
  status text not null default 'upcoming' check (status in ('upcoming','active','completed')),
  created_at timestamptz default now()
);

-- ── Games ───────────────────────────────────────────────────
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  name text not null,
  type text not null check (type in ('standard','points','multi_participant','cumulative','bracket_single','bracket_double','bracket_round_robin')),
  scoring_direction text not null default 'higher_is_better' check (scoring_direction in ('lower_is_better','higher_is_better')),
  weight numeric not null default 1,
  status text not null default 'pending' check (status in ('pending','active','completed')),
  "order" integer not null default 0,
  created_at timestamptz default now()
);

-- ── Standard Results ────────────────────────────────────────
create table if not exists standard_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  position integer not null
);

-- ── Points Results ──────────────────────────────────────────
create table if not exists points_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  raw_score numeric not null
);

-- ── Participant Results ─────────────────────────────────────
create table if not exists participant_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  participant_name text not null,
  position integer not null
);

-- ── Cumulative Rounds ───────────────────────────────────────
create table if not exists cumulative_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  round_number integer not null,
  scores jsonb not null default '[]'
);

-- ── Bracket Matches ─────────────────────────────────────────
create table if not exists bracket_matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  round integer not null,
  match_number integer not null,
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  score_a integer,
  score_b integer,
  winner_id uuid references teams(id),
  loser_bracket boolean not null default false
);

-- ── FK: users.client_id → clients ──────────────────────────
alter table users add constraint users_client_id_fkey
  foreign key (client_id) references clients(id) on delete set null;

-- ── Disable RLS (app-level auth via username+PIN) ──────────
alter table users disable row level security;
alter table clients disable row level security;
alter table events disable row level security;
alter table teams disable row level security;
alter table editions disable row level security;
alter table games disable row level security;
alter table standard_results disable row level security;
alter table points_results disable row level security;
alter table participant_results disable row level security;
alter table cumulative_rounds disable row level security;
alter table bracket_matches disable row level security;
