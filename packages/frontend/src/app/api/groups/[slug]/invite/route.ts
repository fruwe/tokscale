import { NextResponse } from "next/server";
import { db, groups, groupMembers, groupInvites, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionFromHeader } from "@/lib/auth/session";
import { requireGroupRole } from "@/lib/groups/permissions";
import { generateRandomString } from "@/lib/auth/utils";
import type { GroupRole } from "@/lib/db/schema";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const VALID_INVITE_ROLES: GroupRole[] = ["admin", "member"];

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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

    let body: { username?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const inviteRole = (body.role as GroupRole) || "member";
    if (!VALID_INVITE_ROLES.includes(inviteRole)) {
      return NextResponse.json({ error: "Invalid role. Must be 'admin' or 'member'" }, { status: 400 });
    }

    // Look up the user
    const userResult = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, body.username.trim()))
      .limit(1);

    if (!userResult[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUser = userResult[0];

    // Check if already a member
    const existingMember = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, targetUser.id)))
      .limit(1);

    if (existingMember[0]) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    // Check if there's already a pending invite
    const existingInvite = await db
      .select({ id: groupInvites.id })
      .from(groupInvites)
      .where(
        and(
          eq(groupInvites.groupId, group.id),
          eq(groupInvites.invitedUserId, targetUser.id),
          eq(groupInvites.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite[0]) {
      return NextResponse.json({ error: "Invite already pending for this user" }, { status: 409 });
    }

    const token = generateRandomString(64);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    const [invite] = await db
      .insert(groupInvites)
      .values({
        groupId: group.id,
        invitedUsername: targetUser.username,
        invitedUserId: targetUser.id,
        invitedBy: session.id,
        role: inviteRole,
        token,
        expiresAt,
      })
      .returning();

    return NextResponse.json(invite);
  } catch (error) {
    console.error("Create invite error:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const invites = await db
      .select({
        id: groupInvites.id,
        invitedUsername: groupInvites.invitedUsername,
        invitedUserId: groupInvites.invitedUserId,
        role: groupInvites.role,
        status: groupInvites.status,
        token: groupInvites.token,
        expiresAt: groupInvites.expiresAt,
        createdAt: groupInvites.createdAt,
        inviterUsername: users.username,
      })
      .from(groupInvites)
      .innerJoin(users, eq(groupInvites.invitedBy, users.id))
      .where(
        and(eq(groupInvites.groupId, group.id), eq(groupInvites.status, "pending"))
      )
      .orderBy(groupInvites.createdAt);

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("List invites error:", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}
