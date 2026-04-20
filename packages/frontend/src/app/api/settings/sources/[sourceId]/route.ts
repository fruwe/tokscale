import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { db, submissions } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  decodeSourceParam,
  InvalidSourceParamError,
} from "../../../users/[username]/sources/shared";

const RenameBodySchema = z.object({
  // null / empty → clear the custom label and fall back to the default
  // ("Legacy / Unknown device" / "Unknown device") at render time.
  name: z
    .union([z.string(), z.null()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine(
      (value) => value == null || value.length <= 255,
      { message: "name must be 255 characters or fewer" }
    )
    .refine(
      (value) => value == null || !/\p{C}/u.test(value),
      { message: "name must not contain control characters" }
    ),
});

interface RouteParams {
  params: Promise<{ sourceId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { sourceId: sourceIdParam } = await params;
    const resolvedSourceId = decodeSourceParam(sourceIdParam);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = RenameBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const scopeWhere =
      resolvedSourceId === null
        ? and(eq(submissions.userId, session.id), isNull(submissions.sourceId))
        : and(
            eq(submissions.userId, session.id),
            eq(submissions.sourceId, resolvedSourceId)
          );

    const updated = await db
      .update(submissions)
      .set({ sourceName: name, updatedAt: new Date() })
      .where(scopeWhere)
      .returning({
        sourceId: submissions.sourceId,
        sourceName: submissions.sourceName,
      });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    try {
      revalidateTag(`user:${session.username}`, "max");
    } catch (e) {
      console.error("Cache invalidation failed:", e);
    }

    return NextResponse.json({
      success: true,
      source: updated[0],
    });
  } catch (error) {
    if (error instanceof InvalidSourceParamError) {
      return NextResponse.json(
        { error: "Invalid source id" },
        { status: 400 }
      );
    }
    console.error("Source rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename source" },
      { status: 500 }
    );
  }
}
