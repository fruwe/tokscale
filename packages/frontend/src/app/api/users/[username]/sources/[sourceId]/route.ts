import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, dailyBreakdown, submissions, users } from "@/lib/db";
import {
  aggregateModelUsage,
  createAccumulator,
  decodeSourceParam,
  InvalidSourceParamError,
  mergeSourceContribution,
  normalizeClientId,
  sourceKey,
  toIsoString,
} from "../shared";

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

    const sourceWhere = resolvedSourceId === null
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
        .where(sourceWhere)
        .orderBy(desc(submissions.updatedAt), desc(submissions.id)),

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
        )
        .orderBy(desc(dailyBreakdown.date)),
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

      for (const client of row.sourcesUsed || []) {
        source.clients.add(normalizeClientId(client));
      }

      for (const model of row.modelsUsed || []) {
        source.models.add(model);
      }
    }

    for (const row of dailyRows) {
      mergeSourceContribution(source, row);
    }

    const contributions = Array.from(source.contributions.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => {
        let dayCacheRead = 0;
        let dayCacheWrite = 0;
        let dayReasoning = 0;

        for (const clientData of Object.values(day.clients)) {
          dayCacheRead += clientData.cacheRead || 0;
          dayCacheWrite += clientData.cacheWrite || 0;
          dayReasoning += clientData.reasoning || 0;
        }

        return {
          date: day.date,
          timestampMs: day.timestampMs,
          totals: {
            tokens: day.tokens,
            cost: day.cost,
            messages: 0,
          },
          intensity: 0 as 0 | 1 | 2 | 3 | 4,
          tokenBreakdown: {
            input: day.inputTokens,
            output: day.outputTokens,
            cacheRead: dayCacheRead,
            cacheWrite: dayCacheWrite,
            reasoning: dayReasoning,
          },
          clients: Object.entries(day.clients).map(([client, breakdown]) => ({
            client,
            modelId: breakdown.modelId || "",
            models: breakdown.models || {},
            tokens: {
              input: breakdown.input || 0,
              output: breakdown.output || 0,
              cacheRead: breakdown.cacheRead || 0,
              cacheWrite: breakdown.cacheWrite || 0,
              reasoning: breakdown.reasoning || 0,
            },
            cost: breakdown.cost || 0,
            messages: breakdown.messages || 0,
          })),
        };
      });

    const maxCost = Math.max(...contributions.map((c) => c.totals.cost), 0);
    const normalizedContributions = contributions.map((day) => {
      const cost = day.totals.cost;
      const intensity =
        maxCost === 0
          ? 0
          : cost === 0
          ? 0
          : cost <= maxCost * 0.25
          ? 1
          : cost <= maxCost * 0.5
          ? 2
          : cost <= maxCost * 0.75
          ? 3
          : 4;
      return {
        ...day,
        intensity: intensity as 0 | 1 | 2 | 3 | 4,
      };
    });

    return NextResponse.json({
      user,
      source: {
        sourceId: source.sourceId,
        sourceKey: sourceKey(source.sourceId),
        sourceName: source.sourceName,
        stats: {
          totalTokens: source.totalTokens,
          totalCost: source.totalCost,
          inputTokens: source.inputTokens,
          outputTokens: source.outputTokens,
          cacheReadTokens: source.cacheReadTokens,
          cacheWriteTokens: source.cacheWriteTokens,
          reasoningTokens: source.reasoningTokens,
          submissionCount: source.submissionCount,
          activeDays: normalizedContributions.filter((day) => day.totals.tokens > 0).length,
        },
        dateRange: {
          start: source.dateStart,
          end: source.dateEnd,
        },
        updatedAt: source.updatedAt,
        clients: Array.from(source.clients).sort(),
        models: Array.from(source.models).sort(),
        modelUsage: aggregateModelUsage(source),
        contributions: normalizedContributions,
      },
    });
  } catch (error) {
    if (error instanceof InvalidSourceParamError) {
      return NextResponse.json(
        { error: "Invalid source id" },
        { status: 400 }
      );
    }
    console.error("User source detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user source" },
      { status: 500 }
    );
  }
}
