import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, clearSession } from "@/lib/auth/session";
import { db, users } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const username = session.username;

    // Delete the user row — all related data (sessions, apiTokens,
    // submissions → dailyBreakdown, deviceCodes) cascades automatically
    // via ON DELETE CASCADE foreign keys.
    const deletedRows = await db
      .delete(users)
      .where(eq(users.id, session.id))
      .returning({ id: users.id });

    if (deletedRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Clear the session cookie so the browser doesn't hold a stale token.
    // The DB session row is already gone via cascade, but the cookie
    // still needs explicit removal.
    try {
      await clearSession();
    } catch {
      // Cookie cleanup is best-effort — the session row is already gone.
    }

    try {
      revalidateTag("leaderboard", "max");
      revalidateTag(`user:${username}`, "max");
      revalidateTag("user-rank", "max");
      revalidateTag(`user-rank:${username}`, "max");
      revalidateTag(`embed-user:${username}`, "max");
      revalidateTag(`embed-user:${username}:tokens`, "max");
      revalidateTag(`embed-user:${username}:cost`, "max");

      revalidatePath("/leaderboard");
      revalidatePath("/profile");
      revalidatePath(`/u/${username}`);
      revalidatePath(`/api/users/${username}`);
      revalidatePath(`/api/embed/${username}/svg`);
    } catch {
      // Cache invalidation is best-effort.
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Account delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
