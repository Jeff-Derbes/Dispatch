import { db } from "../index";
import { users } from "../schema";

export async function upsertUser(id: string, email: string) {
  await db
    .insert(users)
    .values({ id, email })
    .onConflictDoNothing();
}
