# Clickylearner

A typing-based study tool with AI-generated flashcards, active recall, and session history.

## Stack

- **Frontend** — React 18 + Vite + Framer Motion
- **Backend** — Express.js
- **AI** — OpenAI `gpt-4o-mini` (note generation + quiz generation)
- **Auth + Database** — Supabase (email/password, Google OAuth)

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment variables

**`server/.env`**
```
OPENAI_API_KEY=sk-...
PORT=3001
```

**`client/.env`**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Set up Supabase

Run this SQL in your Supabase **SQL Editor**:

```sql
create table flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  notes jsonb not null,
  folder_id uuid,
  created_at timestamptz default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mode text not null,
  wpm integer,
  accuracy numeric(5,2),
  errors integer,
  total_chars integer,
  note_results jsonb,
  flashcard_set_id uuid,
  created_at timestamptz default now()
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table flashcard_sets enable row level security;
alter table runs enable row level security;
alter table folders enable row level security;

create policy "own flashcard sets" on flashcard_sets for all using (auth.uid() = user_id);
create policy "own runs" on runs for all using (auth.uid() = user_id);
create policy "own folders" on folders for all using (auth.uid() = user_id);

alter table flashcard_sets add column if not exists folder_id uuid references folders(id) on delete set null;
```

### 4. Run locally

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

App runs at `http://localhost:5173`.

## Game Modes

| Mode | Description |
|------|-------------|
| **Standard** | Type through all notes once |
| **Flashcards** | Two-pass: study then recall with blacked-out words. Unlocks AI quiz. |
| **Speed** | Endless random sentences, no upload needed |

## Production

Set `NODE_ENV=production` and `ALLOWED_ORIGIN=https://yourdomain.com` in `server/.env` to restrict CORS.
