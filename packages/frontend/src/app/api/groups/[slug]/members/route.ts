import { NextResponse } from "next/server";
import { db, groups, groupMembers, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionFromHeader } from "@/lib/auth/session";
import { requireGroupRole } from "@/lib/groups/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSessionFromHeader(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug } = await params;
    const groupResult = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    if (!groupResult[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = groupResult[0];
    const membership = await requireGroupRole(group.id, session.id, "member");
    if (!membership) {
      return NextResponse.json({ error: "Must be a group member" }, { status: 403 });
    }

    const members = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, group.id))
      .orderBy(groupMembers.joinedAt);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("List members error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSessionFromHeader(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug } = await params;
    const groupResult = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    if (!groupResult[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = groupResult[0];
    const membership = await requireGroupRole(group.id, session.id, "admin");
    if (!membership) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let body: { userId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (body.userId === session.id) {
      return NextResponse.json({ error: "Cannot remove yourself. Use leave instead." }, { status: 400 });
    }

    // Check target member exists and is not owner
    const targetMember = await db
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, body.userId)))
      .limit(1);

    if (!targetMember[0]) {
      return NextResponse.json({ error: "User is not a member" }, { status: 404 });
    }

    if (targetMember[0].role === "owner") {
      return NextResponse.json({ error: "Cannot remove the group owner" }, { status: 403 });
    }

    if (targetMember[0].role === "admin" && membership.role === "admin") {
      return NextResponse.json({ error: "Only the owner can remove admins" }, { status: 403 });
    }

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, body.userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
