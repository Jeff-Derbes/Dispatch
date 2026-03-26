# Dispatch V2 Spec

## Summary

Dispatch v2 shifts the product from "task tracker with AI helpers" to
"AI-assisted execution planner."

V1 proved the core stack, auth model, CRUD flows, and two AI entry points
(task breakdown and priority suggestions). V2 makes AI outputs durable,
structured, and useful over time. The product should help a user answer:

- What should I do next?
- What is blocked?
- What am I missing?
- What sequence gets this project done fastest?

This spec is written to extend the existing `Next.js + App Router + Clerk +
Drizzle + Postgres` architecture. It replaces v1 patterns only where
necessary.

---

## Product Thesis

Dispatch is a focused personal planning tool that turns vague project goals
into concrete tasks, clear sequencing, explicit blockers, and one recommended
next action.

AI should not behave like a freeform assistant. It should generate and review
structured plans that the user can accept, edit, or ignore.

---

## V2 Goals

1. Make planning data first-class, not ephemeral UI state.
2. Add dependency-aware sequencing so prioritization is meaningful.
3. Introduce a persistent "next action" experience per project.
4. Store AI rationale and plan reviews so guidance survives page refresh.
5. Keep scope portfolio-quality and single-user.

---

## Non-Goals

These remain out of scope for v2:

- Collaboration / teams
- Comments / activity feeds
- Notifications / reminders
- Calendar sync
- Mobile app / PWA
- Generic AI chat interface
- Attachments / document management

---

## Primary User Stories

1. **Project planning** — As a user, I can generate a draft execution plan
   from a project goal and receive tasks, dependency links, effort estimates,
   impact estimates, and phases.

2. **Plan review** — As a user, I can ask Dispatch to review my current
   project and tell me what is blocked, what is missing, what is
   over-prioritized, and what should happen next.

3. **Next action** — As a user, I can open a project and immediately see the
   single best next task to work on.

4. **Persistent AI context** — As a user, I can revisit prior AI
   recommendations without re-running the model on every page load.

---

## V2 Scope

### MVP

- Richer task model (effort, impact, phase, blocked reason)
- Task dependencies
- AI plan generation
- AI project review
- Next action recommendation
- Persistent AI rationale storage
- Project page redesigned around plan state

### V2.1 — Ship only after MVP is stable

- Plan version history
- Regenerate only part of a plan
- Dashboard-level "focus today" rollup
- Lightweight timeline / milestone view

---

## Data Model Changes

The existing `projects` and `tasks` tables are kept. The following changes
extend them.

### Tasks table — new columns

```sql
effort              TEXT NOT NULL DEFAULT 'medium'
impact              TEXT NOT NULL DEFAULT 'medium'
blocked_reason      TEXT
recommended_next    BOOLEAN NOT NULL DEFAULT FALSE
ai_rationale        TEXT
last_ai_reviewed_at TIMESTAMP
phase               TEXT
```

Allowed values (enforced via Zod, not DB enums):

- `effort`: `small | medium | large`
- `impact`: `low | medium | high`

Rules:

- `recommended_next` is set only by server-side AI flows, never by direct
  client writes.
- `last_ai_reviewed_at` is set only by server-side AI flows.
- `ai_rationale` is set only by server-side AI flows.
- All other new columns are client-editable.

### New table: `task_dependencies`

Represents prerequisite relationships between tasks.

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
created_at        TIMESTAMP NOT NULL DEFAULT NOW()

UNIQUE (task_id, depends_on_task_id)
CHECK  (task_id != depends_on_task_id)
```

Semantics: if Task B has a row where `task_id = B` and `depends_on_task_id =
A`, then B is blocked until A's status is `done`.

Server-side enforcement on create:

- Reject self-dependency (`task_id = depends_on_task_id`).
- Reject duplicate rows (covered by unique constraint).
- Reject cross-project dependencies (verify both tasks share `project_id` and
  `user_id`).
- Detect and reject cycles: before inserting, walk the existing dependency
  graph from `depends_on_task_id` and confirm it does not lead back to
  `task_id`. Reject if a cycle would be created.

### New table: `project_ai_reviews`

Stores structured AI review output per project.

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
summary             TEXT NOT NULL
next_action_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL
risks_json          JSONB NOT NULL DEFAULT '[]'
gaps_json           JSONB NOT NULL DEFAULT '[]'
rebalance_json      JSONB NOT NULL DEFAULT '[]'
created_at          TIMESTAMP NOT NULL DEFAULT NOW()
```

TypeScript shapes for the JSONB columns:

```ts
// risks_json
type Risk = string; // plain sentences

// gaps_json
type Gap = {
  title: string;
  description: string;
};

// rebalance_json
type RebalanceSuggestion = {
  taskId: string;
  suggestedPriority: "low" | "medium" | "high";
  rationale: string;
};
```

Notes:

- The UI displays only the most recent review row per project.
- Multiple rows accumulate over time, enabling plan history in V2.1.
- `next_action_task_id` is the canonical source of truth for which task is
  the current next action. The `recommended_next` boolean on the tasks table
  is a denormalized cache of this value.

### Source of truth rule: next action

`project_ai_reviews.next_action_task_id` is authoritative.
`tasks.recommended_next` is a derived cache. When a review is written:

1. Clear `recommended_next = false` on all tasks for the project.
2. Set `recommended_next = true` on the referenced task.
3. If `next_action_task_id` is null or the referenced task is later deleted
   (`ON DELETE SET NULL`), treat the project as having no next action.

---

## Derived Task States

These are computed at read time. No additional tables required.

### Ready

A task is `ready` when:

- status is not `done`
- it has no dependencies where the dependency's status is not `done`
- `blocked_reason` is null or empty

### Blocked

A task is `blocked` when:

- it has at least one dependency whose status is not `done`, or
- `blocked_reason` is set

### Next action

Exactly one task per project may be `recommended_next = true` at a time.
This is always set atomically by server logic, never via direct client edit.

---

## AI Features

### 1. Generate Plan

**Purpose:** Create an initial execution plan from a project goal.

**Input:**

```json
{
  "projectId": "uuid",
  "projectName": "Portfolio Site Refresh",
  "description": "Redesign my site, improve case studies, ship a faster homepage."
}
```

**Output (validated before any DB write):**

```json
{
  "summary": "A 6-step plan covering design, content, implementation, and launch.",
  "phases": [
    { "name": "Discovery", "order": 0 },
    { "name": "Implementation", "order": 1 }
  ],
  "tasks": [
    {
      "clientId": "temp-1",
      "title": "Audit current site content",
      "description": "Review existing pages and note what should be rewritten or removed.",
      "priority": "high",
      "effort": "small",
      "impact": "high",
      "phase": "Discovery",
      "dependsOnClientIds": []
    },
    {
      "clientId": "temp-2",
      "title": "Rewrite homepage messaging",
      "description": "Draft clearer value proposition and supporting sections.",
      "priority": "high",
      "effort": "medium",
      "impact": "high",
      "phase": "Discovery",
      "dependsOnClientIds": ["temp-1"]
    }
  ]
}
```

**UX behavior:**

- Show generated tasks in a review panel before saving.
- Allow deselecting tasks.
- Allow editing task fields before applying.
- Dependency handling on deselect: if Task B depends on Task A and the user
  deselects Task A, remove the dependency before saving. Do not block the
  save; warn the user that the dependency was dropped.
- Persist only the dependencies between tasks that were actually selected.

**System prompt requirements:**

- Return raw JSON only — no markdown, no prose outside the JSON object.
- Generate 4–10 tasks.
- Include dependencies only when a clear prerequisite relationship exists.
- Avoid circular dependency chains.
- Keep titles concrete and action-oriented.

### 2. Review Plan

**Purpose:** Evaluate the current project state and recommend improvements.

**Input:**

- Project name and description
- All non-done tasks (id, title, description, priority, effort, impact,
  phase, blocked_reason)
- Dependency graph (list of `{ taskId, dependsOnTaskId }` pairs)

**Output (validated before any DB write):**

```json
{
  "summary": "The plan is workable but missing a launch checklist and has two tasks competing for attention too early.",
  "nextActionTaskId": "uuid-of-an-existing-task",
  "risks": ["Implementation is starting before content decisions are stable."],
  "gaps": [
    {
      "title": "Create launch checklist",
      "description": "Add final QA and post-launch validation tasks."
    }
  ],
  "rebalance": [
    {
      "taskId": "uuid",
      "suggestedPriority": "medium",
      "rationale": "This depends on unresolved content work."
    }
  ]
}
```

**Validation rules before DB write:**

- `nextActionTaskId` must match an existing task in the project. If it
  references a nonexistent task, reject the review response and surface an
  error rather than writing partial data.
- `rebalance` entries must each reference a valid task id in the project.
  Drop invalid entries rather than rejecting the whole response.

**UX behavior:**

- Render results inline on the project page.
- User can: apply next action, apply rebalance suggestions, add gap tasks,
  dismiss the review.

**System prompt requirements:**

- Return raw JSON only.
- Identify exactly one best next action from the provided task list.
- Flag sequencing risks only when meaningful, not exhaustively.
- Suggest missing tasks only when the gap is significant.
- Keep rationales short and operational (one to two sentences).

### 3. Rebalance Plan

Rebalance is a narrow mode of Review, not a separate AI feature.

It uses the same `/api/ai/review` endpoint with a flag indicating the request
is a rebalance pass. The model prompt emphasizes reprioritization over gap
analysis. The response shape is identical to Review.

Purpose:

- Reprioritize tasks based on current progress.
- Update `recommended_next`.
- Clear stale recommendations.

---

## API Changes

### New routes

```
POST   /api/ai/plan
POST   /api/ai/review
POST   /api/projects/[id]/dependencies
DELETE /api/projects/[id]/dependencies/[dependencyId]
PATCH  /api/projects/[id]/next-action
```

### Modified routes

**`POST /api/projects/[id]/tasks`** — extend body to accept:

- `effort`
- `impact`
- `phase`
- `blockedReason`

Do not accept: `recommendedNext`, `lastAiReviewedAt`, `aiRationale`.

**`PATCH /api/tasks/[id]`** — extend update support to include:

- `effort`
- `impact`
- `phase`
- `blockedReason`

Do not accept from the client: `recommendedNext`, `lastAiReviewedAt`,
`aiRationale`.

**`POST /api/ai/breakdown`** — keep during migration; replace UI with the
new plan flow. Remove after the plan flow is stable. This is a deliberate
deprecation, not an open-ended "later."

---

## Validation Contracts

Add Zod enums in `src/lib/validations.ts`:

```ts
export const taskEffort = z.enum(["small", "medium", "large"]);
export const taskImpact = z.enum(["low", "medium", "high"]);
```

Add schemas for:

- Create dependency request
- AI plan response
- AI review response
- Next action update

**Rule:** All AI responses must be validated against their Zod schema before
any DB write. Follow the v1 pattern already in `src/lib/validations.ts`.

---

## Server-Side Rules

### Auth and ownership

Follow the v1 pattern from `CLAUDE.md`:

- Resolve `userId` from Clerk server-side on every request.
- Verify project ownership before any read or write operation.
- Verify both tasks belong to the same project and user before creating a
  dependency.

### Dependency integrity

On dependency create:

1. Reject self-dependency.
2. Reject duplicate (covered by DB constraint, but catch and return 409).
3. Reject cross-project links.
4. Reject cycles: walk the existing dependency graph from `depends_on_task_id`
   and confirm it does not reach `task_id`.

### Next action integrity

When setting a new next action (via review or direct PATCH):

1. Within a single transaction: clear all `recommended_next = true` for the
   project, then set exactly one task to `recommended_next = true`.
2. If `next_action_task_id` is null, only clear existing flags.

### Task completion behavior

When a task is marked `done`, dependent tasks become eligible for `ready`
state automatically — readiness is computed at read time, so no additional
writes are needed.

---

## Information Architecture

### Dashboard

Keep the current dashboard. Add summary fields to each project card:

- `nextActionTitle` — title of the current `recommended_next` task
- `blockedTaskCount`
- `completionState` — count or percentage of done tasks

### Project Page

The project page is the primary V2 surface.

**Structure:**

1. Project header
2. Next Action card
3. Plan Health card
4. Task list grouped by: Ready / Blocked / In Progress / Done
5. AI action buttons: Generate plan · Review plan · Rebalance

**Sorting within groups:**

1. `recommended_next` first
2. Priority high → low
3. Position ascending

### Next Action card

Shows:

- Task title
- Effort / impact badges
- AI rationale (one sentence)
- Actions: Mark in progress · Open task · Rerun review

Empty state: "No next action yet. Review this plan to generate one."

### Plan Health card

Shows:

- Review summary sentence
- Count of blocked tasks
- Count of ready tasks
- Count of AI-identified gaps

Actions: Review plan · Add gap tasks

### Task item

Extend `src/components/projects/task-item.tsx` to show:

- Dependency count
- Blocked reason
- AI rationale
- Effort / impact badges

Expanded state includes:

- Edit blocked reason
- View / add dependencies

### Plan Generation panel

Replaces the v1 breakdown panel:

- Goal input
- Generated plan summary
- Editable generated tasks
- Dependency preview with deselect-drops-dependency warning
- Apply selected tasks

### Review Results panel

Inline card (not a chat transcript):

- Summary
- Next action
- Rebalance suggestions
- Suggested gap tasks

---

## Migration Plan

Work through phases in order. Each phase is independently deployable.

### Phase 1 — Data Layer

- Add columns to `tasks`
- Create `task_dependencies` table
- Create `project_ai_reviews` table
- Update Drizzle queries and schema exports

### Phase 2 — Read Model

- Compute ready / blocked task groupings server-side
- Expose next action in project queries
- Compute dashboard summary fields

### Phase 3 — AI Endpoints

- Add `/api/ai/plan` with Zod-validated response
- Add `/api/ai/review` with Zod-validated response
- Dependency creation and deletion endpoints

### Phase 4 — Project UI

- Next Action card
- Plan Health card
- Task list grouped view
- Replace breakdown panel with plan generation panel
- Update task item for planning metadata

### Phase 5 — Hardening

- Error handling for AI validation failures
- Empty states
- Loading states
- Cycle detection regression tests
- Auth and ownership regression tests

---

## Testing Requirements

Add tests for:

- Dependency creation rules (self, duplicate, cross-project, cycle)
- Project ownership validation on all dependency routes
- AI response validation — schema failures must not write to DB
- Next action uniqueness per project
- Task grouping logic (ready, blocked, done transitions)

High-value regression cases:

- Dependency references unauthorized task → reject
- Dependency references task in a different project → reject
- Dependency would create a cycle → reject
- Review response references nonexistent `nextActionTaskId` → reject review
- Completing a prerequisite task correctly transitions dependent to ready
- Deleting the next-action task sets `next_action_task_id` to null via ON
  DELETE SET NULL, and the UI shows the empty state

---

## Acceptance Criteria

V2 MVP is complete when:

1. A user can generate a structured plan from a project description.
2. Generated tasks can include dependencies and planning metadata.
3. A user can review an existing project and receive: one next action, gap
   suggestions, and rebalancing suggestions.
4. The project page clearly distinguishes ready vs. blocked work.
5. AI recommendations persist after page refresh.
6. The app continues to follow v1 auth and validation patterns without
   regression.

---

## What to Keep, Change, and Avoid

**Keep:**

- Clerk auth approach
- Drizzle queries
- Server-only AI calls
- Zod-validation-first API handlers

**Change:**

- Task list from flat view to grouped planning view
- AI from ephemeral component state to stored project intelligence
- Project page from CRUD surface to execution cockpit

**Avoid:**

- Turning this into a chat UI
- Adding collaboration before planning is solid
- Exposing model selection or AI config in the UI

**If scope must shrink, protect these three things above all else:**

- Dependency model
- Next action card
- Persisted AI review
