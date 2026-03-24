import { z } from "zod";

const projectStatus = z.enum(["active", "on_hold", "completed"]);
const taskStatus = z.enum(["backlog", "in_progress", "done"]);
const taskPriority = z.enum(["low", "medium", "high"]);

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: projectStatus.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: projectStatus.optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderTasksSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});
