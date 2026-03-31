# Dispatch

A personal project and task tracker with AI-assisted planning workflows. Built as a portfolio-quality full-stack app with a focus on clean architecture, strict TypeScript, and server-first data patterns.

---

## Features

- **Project management** — create, edit, and archive projects with status tracking
- **Task management** — add, edit, reorder, and delete tasks within projects
- **AI Task Breakdown** — describe a project and Claude generates a structured task list (streaming)
- **AI Smart Prioritization** — Claude suggests priority ordering for existing tasks with inline rationale
- **AI Plan Generation** — generate a full execution plan with effort/impact scores and task dependencies
- **Plan Review** — Claude reviews the current plan and surfaces gaps, blockers, and a recommended next action
- **Plan Rebalance** — redistributes work based on current task states
- **Task Dependencies** — track blocking relationships between tasks
- **Execution Cockpit** — project page shows recommended next action, plan health, and grouped task list

---

## Tech Stack

| Layer      | Choice                  |
| ---------- | ----------------------- |
| Framework  | Next.js 16 (App Router) |
| Language   | TypeScript (strict)     |
| Styling    | Tailwind CSS v4         |
| Database   | Supabase (Postgres)     |
| ORM        | Drizzle ORM             |
| Auth       | Clerk                   |
| AI         | Anthropic Claude API    |
| Validation | Zod                     |
| Deployment | Vercel                  |

---

## Project Structure

```
src/
  app/
    (auth)/
      sign-in/           # Clerk sign-in page
      sign-up/           # Clerk sign-up page
    (app)/
      dashboard/         # Project list
      projects/[id]/     # Project detail (execution cockpit)
        settings/        # Project settings
    api/
      projects/          # CRUD for projects
      tasks/             # CRUD for tasks
      ai/
        breakdown/       # Streaming task generation
        prioritize/      # Batch priority suggestions
        plan/            # Full plan generation
  components/
    ui/                  # Button, Card, Badge, Input, Textarea
    projects/            # Project page components (task list, AI panels, etc.)
  db/
    schema.ts            # Single source of truth for all DB types
    queries/
      projects.ts
      tasks.ts
  lib/
    auth.ts              # Clerk server helpers
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (used as plain Postgres — connection string only)
- A [Clerk](https://clerk.com) application
- An [Anthropic](https://console.anthropic.com) API key

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL=postgresql://...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database

Dispatch uses Drizzle ORM with a Postgres connection string. No Supabase client SDK or RLS is used.

### Schema

```sql
users
  id          TEXT PRIMARY KEY  -- Clerk user ID
  email       TEXT NOT NULL
  created_at  TIMESTAMP

projects
  id          UUID PRIMARY KEY
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE
  name        TEXT NOT NULL
  description TEXT
  status      TEXT  -- 'active' | 'on_hold' | 'completed'
  created_at  TIMESTAMP
  updated_at  TIMESTAMP

tasks
  id             UUID PRIMARY KEY
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE
  title          TEXT NOT NULL
  description    TEXT
  status         TEXT  -- 'backlog' | 'in_progress' | 'done'
  priority       TEXT  -- 'low' | 'medium' | 'high'
  effort         TEXT  -- 'small' | 'medium' | 'large'
  impact         TEXT  -- 'low' | 'medium' | 'high'
  position       INTEGER
  ai_generated   BOOLEAN
  ai_rationale   TEXT
  blocked_reason TEXT
  created_at     TIMESTAMP
  updated_at     TIMESTAMP

task_dependencies
  id              UUID PRIMARY KEY
  task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE
  depends_on_id   UUID REFERENCES tasks(id) ON DELETE CASCADE
```

### Migrations

```bash
# Generate migration files from schema changes
npm run db:generate

# Apply migrations to the database
npm run db:migrate

# Open Drizzle Studio (visual DB browser)
npm run db:studio
```

---

## API Reference

All routes require a valid Clerk session. Resources are always scoped to the authenticated user.

| Method | Route                                | Description                          |
| ------ | ------------------------------------ | ------------------------------------ |
| POST   | `/api/projects`                      | Create a project                     |
| PATCH  | `/api/projects/[id]`                 | Update a project                     |
| DELETE | `/api/projects/[id]`                 | Delete a project                     |
| POST   | `/api/projects/[id]/tasks`           | Create a task                        |
| PATCH  | `/api/projects/[id]/tasks/reorder`   | Batch update task positions          |
| PATCH  | `/api/tasks/[id]`                    | Update a task                        |
| DELETE | `/api/tasks/[id]`                    | Delete a task                        |
| POST   | `/api/ai/breakdown`                  | Stream AI-generated task breakdown   |
| POST   | `/api/ai/prioritize`                 | Get AI priority suggestions (JSON)   |
| POST   | `/api/ai/plan`                       | Generate a full AI execution plan    |

---

## AI Features

### Task Breakdown — `/api/ai/breakdown`

Accepts a project name and description. Returns a **streaming** response of suggested tasks. Tasks are shown in a panel with checkboxes — the user selects which to add, then clicks "Add selected." All AI-generated tasks are flagged with `ai_generated: true` and shown with a sparkle indicator.

### Smart Prioritization — `/api/ai/prioritize`

Accepts the current task list. Returns **synchronous JSON** with a suggested priority and rationale for each task. Shown inline — user can apply all suggestions or dismiss.

### Plan Generation — `/api/ai/plan`

Generates a structured execution plan: tasks with effort/impact scores, dependencies, and a recommended starting point. Tasks are previewed with editable titles before being applied to the project.

### Plan Review

Claude reviews the current state of the plan and returns a summary, recommended next action, and any identified gaps. Gap tasks can be added directly from the review panel.

---

## Deployment

The app is designed for deployment on [Vercel](https://vercel.com). Set all environment variables in the Vercel project settings, then push to the connected branch.

```bash
npm run build   # Verify the build locally before deploying
```
