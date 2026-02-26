import { NextResponse } from "next/server";
import { db, groups, groupMembers } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getSessionFromHeader } from "@/lib/auth/session";
import { generateUniqueSlug } from "@/lib/groups/slug";
import { getGroupMembership, requireGroupRole } from "@/lib/groups/permissions";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const group = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    if (!group[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const targetGroup = group[0];
    const session = await getSessionFromHeader(request);

    let membership: { role: "owner" | "admin" | "member" } | null = null;
    if (session) {
      membership = await getGroupMembership(targetGroup.id, session.id);
    }

    if (!targetGroup.isPublic && !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [memberCountResult] = await db
      .select({ count: sql<number>`COUNT(*)`.as("count") })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, targetGroup.id));

    return NextResponse.json({
      ...targetGroup,
      memberCount: Number(memberCountResult?.count) || 0,
      membership,
    });
  } catch (error) {
    console.error("Get group error:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSessionFromHeader(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug } = await params;
    const group = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    if (!group[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const targetGroup = group[0];
    const allowed = await requireGroupRole(targetGroup.id, session.id, "admin");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
      avatarUrl?: string | null;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updateData: {
      name?: string;
      slug?: string;
      description?: string | null;
      isPublic?: boolean;
      avatarUrl?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (typeof body.name === "string") {
      const nextName = body.name.trim();
      if (!nextName) {
        return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 });
      }
      if (nextName.length > 100) {
        return NextResponse.json({ error: "Group name must be 100 characters or less" }, { status: 400 });
      }

      updateData.name = nextName;
      if (nextName !== targetGroup.name) {
        updateData.slug = await generateUniqueSlug(nextName);
      }
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.avatarUrl !== undefined) {
      updateData.avatarUrl = body.avatarUrl?.trim() || null;
    }

    if (typeof body.isPublic === "boolean") {
      updateData.isPublic = body.isPublic;
    }

    const [updated] = await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, targetGroup.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSessionFromHeader(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug } = await params;
    const group = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
    if (!group[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const targetGroup = group[0];
    const membership = await getGroupMembership(targetGroup.id, session.id);
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only the owner can delete this group" }, { status: 403 });
    }

    await db.delete(groups).where(eq(groups.id, targetGroup.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
