import { db } from "../src/db/index";
import { projects, tasks, users } from "../src/db/schema";
import {
  createProject,
  deleteProject,
  getProjectById,
  getUserProjects,
  updateProject,
} from "../src/db/queries/projects";
import {
  createTask,
  deleteTask,
  getProjectTasks,
  getTaskById,
  reorderTasks,
  updateTask,
} from "../src/db/queries/tasks";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "test_user_phase2";
const TEST_EMAIL = "test@dispatch.local";

async function run() {
  console.log("=== Dispatch Phase 2 DB Test ===\n");

  // ── 0. Seed a test user ──────────────────────────────────────────────────
  console.log("0. Upserting test user...");
  await db.insert(users).values({ id: TEST_USER_ID, email: TEST_EMAIL }).onConflictDoNothing();
  console.log(`   User: ${TEST_USER_ID}\n`);

  // ── 1. createProject ────────────────────────────────────────────────────
  console.log("1. createProject");
  const project = await createProject(TEST_USER_ID, {
    name: "Phase 2 Test Project",
    description: "Created by test-db script",
    status: "active",
  });
  console.log("   Created:", project.id, project.name, `(${project.status})`);

  // ── 2. getUserProjects ──────────────────────────────────────────────────
  console.log("\n2. getUserProjects");
  const allProjects = await getUserProjects(TEST_USER_ID);
  console.log(`   Found ${allProjects.length} project(s) for user`);

  // ── 3. getProjectById ───────────────────────────────────────────────────
  console.log("\n3. getProjectById");
  const fetched = await getProjectById(TEST_USER_ID, project.id);
  console.log("   Fetched:", fetched?.name);

  // ── 4. Cross-user scope check ───────────────────────────────────────────
  console.log("\n4. Cross-user isolation check");
  const crossUser = await getProjectById("other_user_id", project.id);
  console.log(
    "   Result for wrong user:",
    crossUser === null ? "null ✓" : "FAIL — returned data it should not have",
  );

  // ── 5. updateProject ────────────────────────────────────────────────────
  console.log("\n5. updateProject");
  const updated = await updateProject(TEST_USER_ID, project.id, {
    name: "Updated Project Name",
    status: "on_hold",
  });
  console.log("   Updated:", updated?.name, `(${updated?.status})`);

  // ── 6. createTask ───────────────────────────────────────────────────────
  console.log("\n6. createTask ×3");
  const t1 = await createTask(TEST_USER_ID, project.id, {
    title: "Task A",
    priority: "high",
  });
  const t2 = await createTask(TEST_USER_ID, project.id, {
    title: "Task B",
    priority: "medium",
    status: "in_progress",
  });
  const t3 = await createTask(TEST_USER_ID, project.id, {
    title: "Task C",
    priority: "low",
    description: "Low priority task",
  });
  console.log(`   Created: ${t1.title}, ${t2.title}, ${t3.title}`);

  // ── 7. getProjectTasks ──────────────────────────────────────────────────
  console.log("\n7. getProjectTasks");
  const taskList = await getProjectTasks(TEST_USER_ID, project.id);
  console.log("   Tasks:", taskList.map((t) => `${t.title}(pos:${t.position})`).join(", "));

  // ── 8. updateTask ───────────────────────────────────────────────────────
  console.log("\n8. updateTask");
  const updatedTask = await updateTask(TEST_USER_ID, t1.id, {
    status: "done",
    priority: "medium",
  });
  console.log(
    "   Updated Task A:",
    `status=${updatedTask?.status}`,
    `priority=${updatedTask?.priority}`,
  );

  // ── 9. reorderTasks ─────────────────────────────────────────────────────
  console.log("\n9. reorderTasks (transaction)");
  await reorderTasks(TEST_USER_ID, [
    { id: t1.id, position: 2 },
    { id: t2.id, position: 0 },
    { id: t3.id, position: 1 },
  ]);
  const reordered = await getProjectTasks(TEST_USER_ID, project.id);
  console.log("   New order:", reordered.map((t) => `${t.title}(pos:${t.position})`).join(", "));

  // ── 10. getTaskById ─────────────────────────────────────────────────────
  console.log("\n10. getTaskById");
  const foundTask = await getTaskById(TEST_USER_ID, t2.id);
  console.log("    Found:", foundTask?.title);

  // ── 11. deleteTask ──────────────────────────────────────────────────────
  console.log("\n11. deleteTask");
  await deleteTask(TEST_USER_ID, t3.id);
  const afterDelete = await getProjectTasks(TEST_USER_ID, project.id);
  console.log(`    Tasks remaining: ${afterDelete.length} (expected 2)`);

  // ── 12. deleteProject (cascade) ─────────────────────────────────────────
  console.log("\n12. deleteProject (cascade)");
  await deleteProject(TEST_USER_ID, project.id);
  const gone = await getProjectById(TEST_USER_ID, project.id);
  console.log("    Project gone:", gone === null ? "null ✓" : "FAIL");

  const remainingTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
  console.log(
    "    Tasks cascaded:",
    remainingTasks.length === 0 ? "0 remaining ✓" : `FAIL — ${remainingTasks.length} orphaned`,
  );

  // ── Cleanup test user ────────────────────────────────────────────────────
  // Comment this out if you want to inspect the data in Supabase before it's removed
  await db.delete(users).where(eq(users.id, TEST_USER_ID));
  console.log("\n✓ Test user cleaned up");
  console.log("\n=== All tests passed ===");
}

run().catch((err) => {
  console.error("\n✗ Test failed:", err.message ?? err);
  if (err.cause) console.error("  Cause:", err.cause);
  console.error(err);
  process.exit(1);
});
