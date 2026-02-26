import { db, groups } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Convert a group name to a URL-friendly slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/**
 * Generate a unique slug, appending a suffix if needed.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) {
    // Fallback for names that slugify to empty string
    return `group-${Date.now().toString(36)}`;
  }

  let candidate = base;
  let attempt = 0;

  while (true) {
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.slug, candidate))
      .limit(1);

    if (existing.length === 0) return candidate;

    attempt++;
    candidate = `${base}-${attempt}`;
  }
}
