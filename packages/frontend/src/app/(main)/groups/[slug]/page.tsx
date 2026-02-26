import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { LeaderboardSkeleton } from "@/components/Skeleton";
import { db, groups } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { groupMembers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getGroupMembership } from "@/lib/groups/permissions";
import { getGroupLeaderboardData } from "@/lib/groups/getGroupLeaderboard";
import GroupDetailClient from "./GroupDetailClient";

async function getGroupData(slug: string) {
  const result = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      description: groups.description,
      avatarUrl: groups.avatarUrl,
      isPublic: groups.isPublic,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM group_members WHERE group_id = ${groups.id})`.as(
        "member_count"
      ),
    })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await getGroupData(slug);
  if (!group) notFound();

  const session = await getSession();

  // Check membership
  let userRole: string | null = null;
  if (session) {
    const membership = await getGroupMembership(group.id, session.id);
    userRole = membership?.role ?? null;
  }

  // If private and not a member, deny
  if (!group.isPublic && !userRole) {
    notFound();
  }

  const initialLeaderboard = await getGroupLeaderboardData(
    group.id,
    "all",
    1,
    50,
    "tokens"
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg-default)",
      }}
    >
      <Navigation />
      <main className="main-container">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <GroupDetailClient
            group={group}
            userRole={userRole}
            currentUser={session}
            initialLeaderboard={initialLeaderboard}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
