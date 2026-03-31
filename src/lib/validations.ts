import { z } from "zod";

const projectStatus = z.enum(["active", "on_hold", "completed"]);
const taskStatus = z.enum(["backlog", "in_progress", "done"]);
const taskPriority = z.enum(["low", "medium", "high"]);

// V2 enums
export const taskEffort = z.enum(["small", "medium", "large"]);
export const taskImpact = z.enum(["low", "medium", "high"]);

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: projectStatus.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: projectStatus.optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  aiGenerated: z.boolean().optional(),
  effort: taskEffort.optional(),
  impact: taskImpact.optional(),
  phase: z.string().nullable().optional(),
  blockedReason: z.string().nullable().optional(),
});


export const aiPrioritizeSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        description: z.string().nullable().optional(),
        priority: taskPriority,
        status: taskStatus,
      })
    )
    .min(1),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  position: z.number().int().min(0).optional(),
  effort: taskEffort.optional(),
  impact: taskImpact.optional(),
  phase: z.string().nullable().optional(),
  blockedReason: z.string().nullable().optional(),
});

export const reorderTasksSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

// V2 schemas

export const createDependencySchema = z.object({
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
});

export const nextActionUpdateSchema = z.object({
  taskId: z.string().uuid().nullable(),
});

export const aiPlanRequestSchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string().min(1),
  description: z.string().min(1),
});

export const aiReviewRequestSchema = z.object({
  projectId: z.string().uuid(),
  mode: z.enum(["review", "rebalance"]).optional().default("review"),
});

const aiPlanTaskSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: taskPriority,
  effort: taskEffort,
  impact: taskImpact,
  phase: z.string().nullable().optional(),
  dependsOnClientIds: z.array(z.string()),
});

export const aiPlanResponseSchema = z.object({
  summary: z.string().min(1),
  phases: z.array(
    z.object({
      name: z.string().min(1),
      order: z.number().int().min(0),
    })
  ),
  tasks: z.array(aiPlanTaskSchema).min(1),
});

export const aiReviewResponseSchema = z.object({
  summary: z.string().min(1),
  nextActionTaskId: z.string().uuid(),
  risks: z.array(z.string()),
  gaps: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    })
  ),
  rebalance: z.array(
    z.object({
      taskId: z.string().uuid(),
      suggestedPriority: taskPriority,
      rationale: z.string().min(1),
    })
  ),
});
