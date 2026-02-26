import { NextResponse } from "next/server";
import { db, groups, groupMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionFromHeader } from "@/lib/auth/session";
import { requireGroupRole } from "@/lib/groups/permissions";
import type { GroupRole } from "@/lib/db/schema";

const ASSIGNABLE_ROLES: GroupRole[] = ["admin", "member"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const session = await getSessionFromHeader(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug, userId } = await params;
    const groupResult = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    if (!groupResult[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = groupResult[0];
    const membership = await requireGroupRole(group.id, session.id, "owner");
    if (!membership) {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    if (userId === session.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    let body: { role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.role || !ASSIGNABLE_ROLES.includes(body.role as GroupRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'member'" },
        { status: 400 }
      );
    }

    // Verify target is a member
    const targetMember = await db
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
      .limit(1);

    if (!targetMember[0]) {
      return NextResponse.json({ error: "User is not a member" }, { status: 404 });
    }

    if (targetMember[0].role === "owner") {
      return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 403 });
    }

    const [updated] = await db
      .update(groupMembers)
      .set({ role: body.role as GroupRole })
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Change role error:", error);
    return NextResponse.json({ error: "Failed to change role" }, { status: 500 });
  }
}
