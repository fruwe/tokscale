import { and, eq, gte, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, dailyBreakdown, submissions, users } from "@/lib/db";
import {
  createAccumulator,
  decodeSourceParam,
  InvalidSourceParamError,
  mergeSourceContribution,
  sourceKey,
  toIsoString,
} from "../../shared";

export const revalidate = 60;

interface RouteParams {
  params: Promise<{ username: string; sourceId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { username, sourceId: sourceIdParam } = await params;
    const resolvedSourceId = decodeSourceParam(sourceIdParam);

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sourceWhere =
      resolvedSourceId === null
        ? and(eq(submissions.userId, user.id), isNull(submissions.sourceId))
        : and(eq(submissions.userId, user.id), eq(submissions.sourceId, resolvedSourceId));

    const [submissionRows, dailyRows] = await Promise.all([
      db
        .select({
          id: submissions.id,
          sourceId: submissions.sourceId,
          sourceName: submissions.sourceName,
          totalTokens: submissions.totalTokens,
          totalCost: submissions.totalCost,
          inputTokens: submissions.inputTokens,
          outputTokens: submissions.outputTokens,
          cacheReadTokens: submissions.cacheReadTokens,
          cacheCreationTokens: submissions.cacheCreationTokens,
          reasoningTokens: submissions.reasoningTokens,
          submitCount: submissions.submitCount,
          dateStart: submissions.dateStart,
          dateEnd: submissions.dateEnd,
          sourcesUsed: submissions.sourcesUsed,
          modelsUsed: submissions.modelsUsed,
          updatedAt: submissions.updatedAt,
        })
        .from(submissions)
        .where(sourceWhere),
      db
        .select({
          date: dailyBreakdown.date,
          timestampMs: dailyBreakdown.timestampMs,
          tokens: dailyBreakdown.tokens,
          cost: dailyBreakdown.cost,
          inputTokens: dailyBreakdown.inputTokens,
          outputTokens: dailyBreakdown.outputTokens,
          sourceBreakdown: dailyBreakdown.sourceBreakdown,
        })
        .from(dailyBreakdown)
        .innerJoin(submissions, eq(dailyBreakdown.submissionId, submissions.id))
        .where(
          and(
            sourceWhere,
            gte(dailyBreakdown.date, oneYearAgo.toISOString().split("T")[0])
          )
        ),
    ]);

    if (submissionRows.length === 0) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const source = createAccumulator(
      submissionRows[0].sourceId,
      submissionRows[0].sourceName
    );

    for (const row of submissionRows) {
      const normalizedUpdatedAt = toIsoString(row.updatedAt);

      source.totalTokens += Number(row.totalTokens) || 0;
      source.totalCost += Number(row.totalCost) || 0;
      source.inputTokens += Number(row.inputTokens) || 0;
      source.outputTokens += Number(row.outputTokens) || 0;
      source.cacheReadTokens += Number(row.cacheReadTokens) || 0;
      source.cacheWriteTokens += Number(row.cacheCreationTokens) || 0;
      source.reasoningTokens += Number(row.reasoningTokens) || 0;
      source.submissionCount += Number(row.submitCount) || 0;

      if (!source.updatedAt || (normalizedUpdatedAt && normalizedUpdatedAt > source.updatedAt)) {
        source.updatedAt = normalizedUpdatedAt;
      }

      if (row.dateStart && (!source.dateStart || row.dateStart < source.dateStart)) {
        source.dateStart = row.dateStart;
      }
      if (row.dateEnd && (!source.dateEnd || row.dateEnd > source.dateEnd)) {
        source.dateEnd = row.dateEnd;
      }

      if (row.sourceName?.trim()) {
        source.sourceName = row.sourceName.trim();
      }
    }

    for (const row of dailyRows) {
      mergeSourceContribution(source, row);
    }

    const activeDays = Array.from(source.contributions.values()).filter(
      (day) => day.tokens > 0
    ).length;

    // Deterministic tie-break: when two clients/models have identical token
    // counts, iteration order of Object.entries depends on insertion order,
    // which in turn depends on DB row ordering — not stable across requests.
    // Alphabetical fallback keeps the UI from flickering between equally-used
    // entries on each render.
    const topClient = Object.entries(
      Array.from(source.contributions.values()).reduce<Record<string, number>>(
        (acc, day) => {
          for (const [client, breakdown] of Object.entries(day.clients)) {
            acc[client] = (acc[client] || 0) + (breakdown.tokens || 0);
          }
          return acc;
        },
        {}
      )
    ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    const topModel = Object.entries(
      Array.from(source.contributions.values()).reduce<Record<string, number>>(
        (acc, day) => {
          for (const [model, data] of Object.entries(day.models)) {
            acc[model] = (acc[model] || 0) + (data.tokens || 0);
          }
          return acc;
        },
        {}
      )
    ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    return NextResponse.json({
      user,
      source: {
        sourceId: source.sourceId,
        sourceKey: sourceKey(source.sourceId),
        sourceName: source.sourceName,
        totalTokens: source.totalTokens,
        totalCost: source.totalCost,
        submissionCount: source.submissionCount,
        activeDays,
        updatedAt: source.updatedAt,
        dateRange: {
          start: source.dateStart,
          end: source.dateEnd,
        },
        topClient,
        topModel,
      },
    });
  } catch (error) {
    if (error instanceof InvalidSourceParamError) {
      return NextResponse.json(
        { error: "Invalid source id" },
        { status: 400 }
      );
    }
    console.error("User source summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user source summary" },
      { status: 500 }
    );
  }
}
