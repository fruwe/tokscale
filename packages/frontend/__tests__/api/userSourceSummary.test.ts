import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const selectResults: Array<Array<Record<string, unknown>>> = [];

  const tables = {
    users: {
      id: "users.id",
      username: "users.username",
      displayName: "users.displayName",
      avatarUrl: "users.avatarUrl",
    },
    submissions: {
      id: "submissions.id",
      userId: "submissions.userId",
      sourceId: "submissions.sourceId",
      sourceName: "submissions.sourceName",
      totalTokens: "submissions.totalTokens",
      totalCost: "submissions.totalCost",
      inputTokens: "submissions.inputTokens",
      outputTokens: "submissions.outputTokens",
      cacheReadTokens: "submissions.cacheReadTokens",
      cacheCreationTokens: "submissions.cacheCreationTokens",
      reasoningTokens: "submissions.reasoningTokens",
      submitCount: "submissions.submitCount",
      dateStart: "submissions.dateStart",
      dateEnd: "submissions.dateEnd",
      sourcesUsed: "submissions.sourcesUsed",
      modelsUsed: "submissions.modelsUsed",
      updatedAt: "submissions.updatedAt",
    },
    dailyBreakdown: {
      submissionId: "dailyBreakdown.submissionId",
      date: "dailyBreakdown.date",
      timestampMs: "dailyBreakdown.timestampMs",
      tokens: "dailyBreakdown.tokens",
      cost: "dailyBreakdown.cost",
      inputTokens: "dailyBreakdown.inputTokens",
      outputTokens: "dailyBreakdown.outputTokens",
      sourceBreakdown: "dailyBreakdown.sourceBreakdown",
    },
  };

  function nextSelectResult() {
    return selectResults.shift() ?? [];
  }

  const db = {
    select: vi.fn(() => {
      const builder = {
        from: vi.fn(() => builder),
        where: vi.fn(() => builder),
        innerJoin: vi.fn(() => builder),
        orderBy: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        then: (resolve: (value: unknown) => unknown) => resolve(nextSelectResult()),
      };
      return builder;
    }),
  };

  const eq = vi.fn(() => "eq");
  const and = vi.fn(() => "and");
  const gte = vi.fn(() => "gte");
  const isNull = vi.fn(() => "isNull");

  return {
    db,
    tables,
    eq,
    and,
    gte,
    isNull,
    reset() {
      selectResults.length = 0;
      db.select.mockClear();
      eq.mockClear();
      and.mockClear();
      gte.mockClear();
      isNull.mockClear();
    },
    pushSelectResult(rows: Array<Record<string, unknown>>) {
      selectResults.push(rows);
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: mockState.db,
  users: mockState.tables.users,
  submissions: mockState.tables.submissions,
  dailyBreakdown: mockState.tables.dailyBreakdown,
}));

vi.mock("drizzle-orm", () => ({
  eq: mockState.eq,
  and: mockState.and,
  gte: mockState.gte,
  isNull: mockState.isNull,
}));

type ModuleExports = typeof import("../../src/app/api/users/[username]/sources/[sourceId]/summary/route");

let GET: ModuleExports["GET"];

beforeAll(async () => {
  const routeModule = await import("../../src/app/api/users/[username]/sources/[sourceId]/summary/route");
  GET = routeModule.GET;
});

beforeEach(() => {
  mockState.reset();
});

describe("GET /api/users/[username]/sources/[sourceId]/summary", () => {
  it("returns a lightweight source summary including top client and top model", async () => {
    mockState.pushSelectResult([
      {
        id: "user-1",
        username: "alice",
        displayName: "Alice",
        avatarUrl: null,
      },
    ]);
    mockState.pushSelectResult([
      {
        id: "submission-1",
        sourceId: "machine-a",
        sourceName: "Work MacBook",
        totalTokens: 1000,
        totalCost: "10.5000",
        inputTokens: 600,
        outputTokens: 400,
        cacheReadTokens: 100,
        cacheCreationTokens: 20,
        reasoningTokens: 10,
        submitCount: 2,
        dateStart: "2026-03-01",
        dateEnd: "2026-03-02",
        sourcesUsed: ["claude"],
        modelsUsed: ["claude-sonnet-4"],
        updatedAt: new Date("2026-03-02T10:00:00.000Z"),
      },
    ]);
    mockState.pushSelectResult([
      {
        date: "2026-03-01",
        timestampMs: 1700000000000,
        tokens: 1000,
        cost: "10.5000",
        inputTokens: 600,
        outputTokens: 400,
        sourceBreakdown: {
          claude: {
            tokens: 1000,
            cost: 10.5,
            input: 600,
            output: 400,
            cacheRead: 100,
            cacheWrite: 20,
            reasoning: 10,
            messages: 4,
            models: {
              "claude-sonnet-4": {
                tokens: 1000,
                cost: 10.5,
                input: 600,
                output: 400,
                cacheRead: 100,
                cacheWrite: 20,
                reasoning: 10,
                messages: 4,
              },
            },
          },
        },
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3000/api/users/alice/sources/machine-a/summary"),
      { params: Promise.resolve({ username: "alice", sourceId: "machine-a" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toMatchObject({
      sourceId: "machine-a",
      sourceKey: "source:machine-a",
      sourceName: "Work MacBook",
      totalTokens: 1000,
      totalCost: 10.5,
      submissionCount: 2,
      activeDays: 1,
      topClient: "claude",
      topModel: "claude-sonnet-4",
    });
  });

  it("breaks topClient / topModel ties alphabetically for determinism", async () => {
    mockState.pushSelectResult([
      { id: "user-1", username: "alice", displayName: "Alice", avatarUrl: null },
    ]);
    mockState.pushSelectResult([
      {
        id: "submission-1",
        sourceId: "machine-a",
        sourceName: "Work",
        totalTokens: 2000,
        totalCost: "20.0000",
        inputTokens: 1200,
        outputTokens: 800,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        reasoningTokens: 0,
        submitCount: 1,
        dateStart: "2026-03-01",
        dateEnd: "2026-03-01",
        // Insertion order intentionally puts "zulu" first to prove that we
        // do NOT return the first-inserted entry on ties.
        sourcesUsed: ["zulu", "alpha"],
        modelsUsed: ["zoo-model", "alpha-model"],
        updatedAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);
    mockState.pushSelectResult([
      {
        date: "2026-03-01",
        timestampMs: 1700000000000,
        tokens: 2000,
        cost: "20.0000",
        inputTokens: 1200,
        outputTokens: 800,
        sourceBreakdown: {
          // Equal token counts — tie-break MUST resolve alphabetically.
          zulu: {
            tokens: 1000,
            cost: 10,
            input: 600,
            output: 400,
            cacheRead: 0,
            cacheWrite: 0,
            reasoning: 0,
            messages: 2,
            models: {
              "zoo-model": {
                tokens: 1000,
                cost: 10,
                input: 600,
                output: 400,
                cacheRead: 0,
                cacheWrite: 0,
                reasoning: 0,
                messages: 2,
              },
            },
          },
          alpha: {
            tokens: 1000,
            cost: 10,
            input: 600,
            output: 400,
            cacheRead: 0,
            cacheWrite: 0,
            reasoning: 0,
            messages: 2,
            models: {
              "alpha-model": {
                tokens: 1000,
                cost: 10,
                input: 600,
                output: 400,
                cacheRead: 0,
                cacheWrite: 0,
                reasoning: 0,
                messages: 2,
              },
            },
          },
        },
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3000/api/users/alice/sources/machine-a/summary"),
      { params: Promise.resolve({ username: "alice", sourceId: "machine-a" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source.topClient).toBe("alpha");
    expect(body.source.topModel).toBe("alpha-model");
  });

  it("returns 404 for an unknown source", async () => {
    mockState.pushSelectResult([
      {
        id: "user-1",
        username: "alice",
        displayName: "Alice",
        avatarUrl: null,
      },
    ]);
    mockState.pushSelectResult([]);
    mockState.pushSelectResult([]);

    const response = await GET(
      new Request("http://localhost:3000/api/users/alice/sources/missing/summary"),
      { params: Promise.resolve({ username: "alice", sourceId: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Source not found" });
  });
});
