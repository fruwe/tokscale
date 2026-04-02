import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, dailyBreakdown, submissions, users } from "@/lib/db";

export const revalidate = 60;

interface RouteParams {
  params: Promise<{ username: string }>;
}

type ModelData = {
  tokens: number;
  cost: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  messages: number;
};

type ClientBreakdown = {
  tokens: number;
  cost: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  messages: number;
  models?: Record<string, ModelData>;
  modelId?: string;
};

type SourceSummaryAccumulator = {
  sourceId: string | null;
  sourceName: string;
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  submissionCount: number;
  updatedAt: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  clients: Set<string>;
  models: Set<string>;
  contributions: Map<
    string,
    {
      date: string;
      timestampMs: number | null;
      tokens: number;
      cost: number;
      inputTokens: number;
      outputTokens: number;
      clients: Record<string, ClientBreakdown>;
      models: Record<string, { tokens: number; cost: number }>;
    }
  >;
};

const LEGACY_CLIENT_ALIASES: Record<string, string> = { kilocode: "kilo" };

function normalizeClientId(id: string): string {
  return LEGACY_CLIENT_ALIASES[id] ?? id;
}

function sourceKey(sourceId: string | null): string {
  return sourceId ?? "__legacy__";
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toSourceName(sourceId: string | null, sourceName: string | null | undefined): string {
  const trimmed = sourceName?.trim();
  if (trimmed) return trimmed;
  return sourceId == null ? "Legacy / Unknown device" : "Unknown device";
}

function createAccumulator(
  sourceId: string | null,
  sourceName: string | null | undefined
): SourceSummaryAccumulator {
  return {
    sourceId,
    sourceName: toSourceName(sourceId, sourceName),
    totalTokens: 0,
    totalCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    submissionCount: 0,
    updatedAt: null,
    dateStart: null,
    dateEnd: null,
    clients: new Set<string>(),
    models: new Set<string>(),
    contributions: new Map(),
  };
}

function mergeSourceContribution(
  accumulator: SourceSummaryAccumulator,
  row: {
    date: string;
    timestampMs: number | null;
    tokens: number;
    cost: string | number;
    inputTokens: number;
    outputTokens: number;
    sourceBreakdown: unknown;
  }
) {
  const existing = accumulator.contributions.get(row.date);
  const normalizedCost = Number(row.cost) || 0;

  const target =
    existing ??
    ({
      date: row.date,
      timestampMs: row.timestampMs ?? null,
      tokens: 0,
      cost: 0,
      inputTokens: 0,
      outputTokens: 0,
      clients: {},
      models: {},
    } satisfies SourceSummaryAccumulator["contributions"] extends Map<string, infer T>
      ? T
      : never);

  if (existing) {
    if (row.timestampMs != null) {
      target.timestampMs =
        target.timestampMs != null
          ? Math.min(target.timestampMs, row.timestampMs)
          : row.timestampMs;
    }
  }

  target.tokens += Number(row.tokens) || 0;
  target.cost += normalizedCost;
  target.inputTokens += Number(row.inputTokens) || 0;
  target.outputTokens += Number(row.outputTokens) || 0;

  if (row.sourceBreakdown && typeof row.sourceBreakdown === "object") {
    for (const [rawClient, data] of Object.entries(
      row.sourceBreakdown as Record<string, ClientBreakdown>
    )) {
      const client = normalizeClientId(rawClient);
      const breakdown = data as ClientBreakdown;

      const existingClient = target.clients[client];
      if (existingClient) {
        existingClient.tokens += breakdown.tokens || 0;
        existingClient.cost += breakdown.cost || 0;
        existingClient.input += breakdown.input || 0;
        existingClient.output += breakdown.output || 0;
        existingClient.cacheRead += breakdown.cacheRead || 0;
        existingClient.cacheWrite += breakdown.cacheWrite || 0;
        existingClient.reasoning += breakdown.reasoning || 0;
        existingClient.messages += breakdown.messages || 0;
      } else {
        target.clients[client] = {
          tokens: breakdown.tokens || 0,
          cost: breakdown.cost || 0,
          input: breakdown.input || 0,
          output: breakdown.output || 0,
          cacheRead: breakdown.cacheRead || 0,
          cacheWrite: breakdown.cacheWrite || 0,
          reasoning: breakdown.reasoning || 0,
          messages: breakdown.messages || 0,
          models: {},
          modelId: breakdown.modelId,
        };
      }

      if (breakdown.models && Object.keys(breakdown.models).length > 0) {
        target.clients[client].models = target.clients[client].models || {};
        for (const [modelId, modelData] of Object.entries(breakdown.models)) {
          const existingModel = target.clients[client].models![modelId];
          if (existingModel) {
            existingModel.tokens += modelData.tokens || 0;
            existingModel.cost += modelData.cost || 0;
            existingModel.input += modelData.input || 0;
            existingModel.output += modelData.output || 0;
            existingModel.cacheRead += modelData.cacheRead || 0;
            existingModel.cacheWrite += modelData.cacheWrite || 0;
            existingModel.reasoning += modelData.reasoning || 0;
            existingModel.messages += modelData.messages || 0;
          } else {
            target.clients[client].models![modelId] = {
              tokens: modelData.tokens || 0,
              cost: modelData.cost || 0,
              input: modelData.input || 0,
              output: modelData.output || 0,
              cacheRead: modelData.cacheRead || 0,
              cacheWrite: modelData.cacheWrite || 0,
              reasoning: modelData.reasoning || 0,
              messages: modelData.messages || 0,
            };
          }

          const existingSourceModel = target.models[modelId];
          if (existingSourceModel) {
            existingSourceModel.tokens += modelData.tokens || 0;
            existingSourceModel.cost += modelData.cost || 0;
          } else {
            target.models[modelId] = {
              tokens: modelData.tokens || 0,
              cost: modelData.cost || 0,
            };
          }
        }
      } else if (breakdown.modelId) {
        const existingSourceModel = target.models[breakdown.modelId];
        if (existingSourceModel) {
          existingSourceModel.tokens += breakdown.tokens || 0;
          existingSourceModel.cost += breakdown.cost || 0;
        } else {
          target.models[breakdown.modelId] = {
            tokens: breakdown.tokens || 0,
            cost: breakdown.cost || 0,
          };
        }
      }
    }
  }

  accumulator.contributions.set(row.date, target);
}

function aggregateModelUsage(
  source: SourceSummaryAccumulator
): Array<{ model: string; tokens: number; cost: number; percentage: number }> {
  const aggregatedModels = Array.from(source.contributions.values()).reduce<
    Record<string, { tokens: number; cost: number }>
  >((acc, day) => {
    for (const [model, data] of Object.entries(day.models)) {
      const existing = acc[model] || { tokens: 0, cost: 0 };
      existing.tokens += data.tokens;
      existing.cost += data.cost;
      acc[model] = existing;
    }
    return acc;
  }, {});

  const totalModelCost = Object.values(aggregatedModels).reduce(
    (sum, model) => sum + model.cost,
    0
  );

  return Object.entries(aggregatedModels)
    .filter(([model]) => model !== "<synthetic>")
    .map(([model, data]) => ({
      model,
      tokens: data.tokens,
      cost: data.cost,
      percentage: totalModelCost > 0 ? (data.cost / totalModelCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens);
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { username } = await params;

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
        .where(eq(submissions.userId, user.id))
        .orderBy(desc(submissions.updatedAt), desc(submissions.id)),

      db
        .select({
          sourceId: submissions.sourceId,
          sourceName: submissions.sourceName,
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
            eq(submissions.userId, user.id),
            gte(dailyBreakdown.date, oneYearAgo.toISOString().split("T")[0])
          )
        )
        .orderBy(desc(dailyBreakdown.date)),
    ]);

    const bySource = new Map<string, SourceSummaryAccumulator>();

    for (const row of submissionRows) {
      const key = sourceKey(row.sourceId);
      if (!bySource.has(key)) {
        bySource.set(key, createAccumulator(row.sourceId, row.sourceName));
      }

      const source = bySource.get(key)!;
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

      if (row.sourceName?.trim() && source.sourceName === toSourceName(row.sourceId, null)) {
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
      const key = sourceKey(row.sourceId);
      if (!bySource.has(key)) {
        bySource.set(key, createAccumulator(row.sourceId, row.sourceName));
      }
      mergeSourceContribution(bySource.get(key)!, row);
    }

    const sources = Array.from(bySource.values())
      .map((source) => {
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

            const maxCostPlaceholder = 0;
            const intensity = maxCostPlaceholder; // replaced below

            return {
              date: day.date,
              timestampMs: day.timestampMs,
              totals: {
                tokens: day.tokens,
                cost: day.cost,
                messages: 0,
              },
              intensity: intensity as 0 | 1 | 2 | 3 | 4,
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

        const activeDays = normalizedContributions.filter(
          (contribution) => contribution.totals.tokens > 0
        ).length;

        return {
          sourceId: source.sourceId,
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
            activeDays,
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
        };
      })
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

    return NextResponse.json({
      user,
      sources,
    });
  } catch (error) {
    console.error("User sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user sources" },
      { status: 500 }
    );
  }
}
