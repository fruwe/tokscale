import { redirect, notFound } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { db, groups } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireGroupRole } from "@/lib/groups/permissions";
import GroupSettingsClient from "./GroupSettingsClient";

export default async function GroupSettingsPage({
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
        <GroupSettingsClient
          group={{
            id: group.id,
            name: group.name,
            slug: group.slug,
            description: group.description,
            isPublic: group.isPublic,
            avatarUrl: group.avatarUrl,
            inviteCode: group.inviteCode,
          }}
          userRole={membership.role}
        />
      </main>
      <Footer />
    </div>
  );
}
