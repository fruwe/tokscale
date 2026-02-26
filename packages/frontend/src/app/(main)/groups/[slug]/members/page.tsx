import { redirect, notFound } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { db, groups } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireGroupRole } from "@/lib/groups/permissions";
import GroupMembersClient from "./GroupMembersClient";

export default async function GroupMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { slug } = await params;
  const groupResult = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!groupResult[0]) notFound();

  const group = groupResult[0];
  const membership = await requireGroupRole(group.id, session.id, "admin");
  if (!membership) notFound();

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
        <GroupMembersClient
          group={{ id: group.id, name: group.name, slug: group.slug }}
          userRole={membership.role}
          currentUserId={session.id}
        />
      </main>
      <Footer />
    </div>
  );
}
