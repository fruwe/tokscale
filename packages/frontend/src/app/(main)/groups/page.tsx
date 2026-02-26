import { Suspense } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { BlackholeHero } from "@/components/BlackholeHero";
import { LeaderboardSkeleton } from "@/components/Skeleton";
import { getSession } from "@/lib/auth/session";
import GroupsClient from "./GroupsClient";

export default function GroupsPage() {
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
        <BlackholeHero />
        <Suspense fallback={<LeaderboardSkeleton />}>
          <GroupsContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

async function GroupsContent() {
  const session = await getSession();
  return <GroupsClient currentUser={session} />;
}
