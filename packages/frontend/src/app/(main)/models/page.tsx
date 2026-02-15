import { Suspense } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { BlackholeHero } from "@/components/BlackholeHero";
import { getModelsData } from "@/lib/models/getModels";
import { ModelsSkeleton } from "./ModelsSkeleton";
import ModelsClient from "./ModelsClient";

export default function ModelsPage() {
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
        <Suspense fallback={<ModelsSkeleton />}>
          <ModelsWithData />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

async function ModelsWithData() {
  try {
    const data = await getModelsData();
    return <ModelsClient initialData={data} />;
  } catch {
    return <div>Failed to load models data</div>;
  }
}
