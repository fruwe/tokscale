import { NextResponse } from "next/server";
import { db, groups, groupMembers, groupInvites } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getSessionFromHeader } from "@/lib/auth/session";
import type { GroupRole } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getSessionFromHeader(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token } = await params;

    // Find the invite
    const inviteResult = await db
      .select({
        invite: groupInvites,
        group: groups,
      })
      .from(groupInvites)
      .innerJoin(groups, eq(groupInvites.groupId, groups.id))
      .where(
        and(
          eq(groupInvites.token, token),
          eq(groupInvites.status, "pending"),
          gt(groupInvites.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!inviteResult[0]) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used invite" },
        { status: 404 }
      );
    }

    const { invite, group } = inviteResult[0];

    // Check if already a member
    const existingMember = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, session.id)
        )
      )
      .limit(1);

    if (existingMember[0]) {
      return NextResponse.json({ error: "Already a member of this group" }, { status: 409 });
    }

    // Accept the invite in a transaction
    await db.transaction(async (tx) => {
      // Add as member
      await tx.insert(groupMembers).values({
        groupId: group.id,
        userId: session.id,
        role: invite.role as GroupRole,
        invitedBy: invite.invitedBy,
      });

      // Mark invite as accepted
      await tx
        .update(groupInvites)
        .set({ status: "accepted" })
        .where(eq(groupInvites.id, invite.id));
    });

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
      },
    });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
