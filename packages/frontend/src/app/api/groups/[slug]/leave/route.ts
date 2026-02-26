import { NextResponse } from "next/server";
import { db, groups, groupMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionFromHeader } from "@/lib/auth/session";
import { getGroupMembership } from "@/lib/groups/permissions";

export async function POST(
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
    const membership = await getGroupMembership(group.id, session.id);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "Owner cannot leave the group. Transfer ownership or delete the group." },
        { status: 400 }
      );
    }

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, session.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave group error:", error);
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
  }
}
