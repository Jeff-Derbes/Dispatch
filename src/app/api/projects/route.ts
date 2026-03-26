import { auth, currentUser } from "@clerk/nextjs/server";
import { createProject } from "@/db/queries/projects";
import { upsertUser } from "@/db/queries/users";
import { createProjectSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  await upsertUser(userId, email);

  const body = await request.json();
  const result = createProjectSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const project = await createProject(userId, result.data);
  return Response.json({ data: project }, { status: 201 });
}
