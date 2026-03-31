import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID (e.g. "user_2abc...")
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // 'active' | 'on_hold' | 'completed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"), // 'backlog' | 'in_progress' | 'done'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  position: integer("position").notNull().default(0),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // V2 columns
  effort: text("effort").notNull().default("medium"), // 'small' | 'medium' | 'large'
  impact: text("impact").notNull().default("medium"), // 'low' | 'medium' | 'high'
  blockedReason: text("blocked_reason"),
  recommendedNext: boolean("recommended_next").notNull().default(false),
  aiRationale: text("ai_rationale"),
  lastAiReviewedAt: timestamp("last_ai_reviewed_at"),
  phase: text("phase"),
});

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_task_dep").on(table.taskId, table.dependsOnTaskId),
    check("chk_task_dep_no_self", sql`"task_id" != "depends_on_task_id"`),
  ]
);

// TypeScript types for projectAiReviews JSONB columns
export type Risk = string;
export type Gap = { title: string; description: string };
export type RebalanceSuggestion = {
  taskId: string;
  suggestedPriority: "low" | "medium" | "high";
  rationale: string;
};

export const projectAiReviews = pgTable("project_ai_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  nextActionTaskId: uuid("next_action_task_id").references(() => tasks.id, {
    onDelete: "set null",
  }),
  risksJson: jsonb("risks_json").$type<Risk[]>().notNull().default([]),
  gapsJson: jsonb("gaps_json").$type<Gap[]>().notNull().default([]),
  rebalanceJson: jsonb("rebalance_json")
    .$type<RebalanceSuggestion[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inferred types for use throughout the app
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type NewTaskDependency = typeof taskDependencies.$inferInsert;

export type ProjectAiReview = typeof projectAiReviews.$inferSelect;
export type NewProjectAiReview = typeof projectAiReviews.$inferInsert;
