export const LEGACY_SOURCE_PARAM = "__legacy__";

export type ModelData = {
  tokens: number;
  cost: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  messages: number;
};

export type ClientBreakdown = {
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

export type SourceContributionAggregate = {
  date: string;
  timestampMs: number | null;
  tokens: number;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  clients: Record<string, ClientBreakdown>;
  models: Record<string, { tokens: number; cost: number }>;
};

export type SourceSummaryAccumulator = {
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
  contributions: Map<string, SourceContributionAggregate>;
};

const LEGACY_CLIENT_ALIASES: Record<string, string> = { kilocode: "kilo" };

export function normalizeClientId(id: string): string {
  return LEGACY_CLIENT_ALIASES[id] ?? id;
}

export function sourceKey(sourceId: string | null): string {
  return sourceId ?? LEGACY_SOURCE_PARAM;
}

export function decodeSourceParam(sourceIdOrLegacy: string): string | null {
  return sourceIdOrLegacy === LEGACY_SOURCE_PARAM ? null : decodeURIComponent(sourceIdOrLegacy);
}

export function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toSourceName(
  sourceId: string | null,
  sourceName: string | null | undefined
): string {
  const trimmed = sourceName?.trim();
  if (trimmed) return trimmed;
  return sourceId == null ? "Legacy / Unknown device" : "Unknown device";
}

export function createAccumulator(
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

export function mergeSourceContribution(
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

  const target: SourceContributionAggregate = existing ?? {
    date: row.date,
    timestampMs: row.timestampMs ?? null,
    tokens: 0,
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
    clients: {},
    models: {},
  };

  if (existing && row.timestampMs != null) {
    target.timestampMs =
      target.timestampMs != null
        ? Math.min(target.timestampMs, row.timestampMs)
        : row.timestampMs;
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

export function aggregateModelUsage(
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
