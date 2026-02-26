import { db, groupMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type { GroupRole } from "@/lib/db/schema";

/**
 * Role hierarchy: owner > admin > member
 */
const ROLE_LEVEL: Record<GroupRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function hasRoleLevel(
  userRole: GroupRole,
  requiredRole: GroupRole
): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

/**
 * Get a user's membership + role in a group.
 * Returns null if not a member.
 */
export async function getGroupMembership(
  groupId: string,
  userId: string
): Promise<{ role: GroupRole } | null> {
  const result = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    )
    .limit(1);

  if (result.length === 0) return null;
  return { role: result[0].role as GroupRole };
}

/**
 * Check if user has at least the required role in a group.
 */
export async function requireGroupRole(
  groupId: string,
  userId: string,
  requiredRole: GroupRole
): Promise<{ role: GroupRole } | null> {
  const membership = await getGroupMembership(groupId, userId);
  if (!membership) return null;
  if (!hasRoleLevel(membership.role, requiredRole)) return null;
  return membership;
}
