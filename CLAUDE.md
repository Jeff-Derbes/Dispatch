@AGENTS.md

# Dispatch — Claude Code Instructions

## Project Overview

Dispatch is a personal project and task tracker with AI-assisted workflows. It is a
portfolio-quality full-stack app — not a startup. Scope is deliberately constrained.

---

## Tech Stack

| Layer      | Choice               | Notes                                                                                       |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------- |
| Framework  | Next.js (App Router) | Server Components for data fetching; Client Components only where interactivity is required |
| Language   | TypeScript           | Strict mode throughout — end-to-end type safety is non-negotiable                           |
| Styling    | Tailwind CSS         | Utility-first, no component library                                                         |
| Database   | Supabase (Postgres)  | Used as plain Postgres via connection string only — no Supabase client SDK, no RLS          |
| ORM        | Drizzle ORM          | `drizzle-orm` + `drizzle-kit`, `postgres` driver                                            |
| Auth       | Clerk                | `@clerk/nextjs` — middleware-level route protection                                         |
| AI         | Anthropic Claude API | Server-side only via Route Handlers — API key never touches the client                      |
| Deployment | Vercel               | Native Next.js support                                                                      |

---

## Project Structure

```
src/
  app/
    (auth)/
      sign-in/
      sign-up/
    dashboard/
    projects/
      [id]/
        settings/
    api/
      projects/
      tasks/
      ai/
        breakdown/
        prioritize/
  components/
    ui/          # Button, Card, Badge, Input, Textarea — Tailwind only
  db/
    schema.ts    # Single source of truth for all DB types
    queries/
      projects.ts
      tasks.ts
  lib/
    auth.ts      # Clerk helpers
```

---

## Database Schema

```sql
users
  id          TEXT PRIMARY KEY  -- Clerk user ID (e.g. "user_2abc...")
  email       TEXT NOT NULL
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()

projects
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  name        TEXT NOT NULL
  description TEXT
  status      TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'on_hold' | 'completed'
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()

tasks
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  title         TEXT NOT NULL
  description   TEXT
  status        TEXT NOT NULL DEFAULT 'backlog'  -- 'backlog' | 'in_progress' | 'done'
  priority      TEXT NOT NULL DEFAULT 'medium'   -- 'low' | 'medium' | 'high'
  position      INTEGER NOT NULL DEFAULT 0       -- used for ordering after AI prioritization
  ai_generated  BOOLEAN NOT NULL DEFAULT FALSE   -- marks AI-created tasks
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
```

**Schema notes:**

- Status and priority are `TEXT` with CHECK constraints — not Postgres enums (avoids painful migration issues)
- `user_id` is denormalized onto tasks intentionally — auth checks are a single field lookup, no joins needed
- No soft deletes — hard deletes cascade
- `position` is updated in batch transactions after AI prioritization is applied

---

## Auth Pattern — Follow This Every Time

Every Route Handler must:

1. Resolve the Clerk `userId` server-side using `auth()` from `@clerk/nextjs/server`
2. Return `401` immediately if no session exists
3. Verify the requested resource belongs to that `userId` before any DB operation
4. Never trust client-supplied user IDs

```ts
// Example pattern for every Route Handler
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const project = await getProjectById(params.id);
  if (!project || project.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(project);
}
```

---

## API Route Structure

```
POST   /api/projects
PATCH  /api/projects/[id]
DELETE /api/projects/[id]

POST   /api/projects/[id]/tasks
PATCH  /api/projects/[id]/tasks/reorder   ← batch position update

PATCH  /api/tasks/[id]
DELETE /api/tasks/[id]

POST   /api/ai/breakdown    ← streaming response
POST   /api/ai/prioritize   ← synchronous JSON response
```

---

## AI Features

### Task Breakdown (`/api/ai/breakdown`)

- Input: `{ projectName: string, description: string }`
- Returns a **streaming** response — tasks appear progressively in the UI
- Claude returns a JSON array: `[{ title, description, priority }]`
- Tasks are NOT auto-added — user selects via checkboxes then clicks "Add selected"
- All AI-generated tasks get `ai_generated: true` in the DB
- Show a sparkle icon (✦) on any task where `ai_generated === true`

### Smart Prioritization (`/api/ai/prioritize`)

- Input: `{ tasks: [{ id, title, description, priority, status }] }`
- Returns **synchronous JSON**: `[{ id, suggestedPriority, rationale }]`
- Rationale is shown inline next to each task — not in a modal
- User can "Apply suggestions" (batch PATCH) or "Dismiss" (no DB write)

---

## Coding Conventions

- **TypeScript strict mode** — no `any`, no type assertions without comment explaining why
- **Server Components by default** — only add `'use client'` when the component needs state, effects, or event handlers
- **Zod validation** on all Route Handler inputs before touching the DB
- **Drizzle for all DB access** — no raw SQL strings, no Supabase client
- **No component libraries** — build UI from Tailwind primitives in `src/components/ui/`
- **`router.refresh()`** or **`revalidatePath()`** after mutations — no optimistic updates in v1
- **Inline editing** for tasks — no separate edit pages or full-page forms
- **Error responses** must be user-readable — no raw 500s reaching the UI

---

## What's Out of Scope (Do Not Add)

- Team / collaboration features
- Comments or activity logs
- Due dates or calendar integration
- File attachments
- Notifications or reminders
- Dark mode
- PWA / mobile-specific layout
- AI chat or multi-turn AI conversations
- Export features
- Supabase client SDK or RLS

---

## Current Build Phase

Refer to the project spec for the full 5-phase build plan. Update this section as phases complete:

- [ ] Phase 1 — Scaffold & Infrastructure
- [ ] Phase 2 — Core Data Layer
- [ ] Phase 3 — Core UI
- [ ] Phase 4 — AI Features
- [ ] Phase 5 — Polish & Deploy
