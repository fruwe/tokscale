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
  const desc = vi.fn(() => "desc");

  return {
    db,
    tables,
    eq,
    and,
    gte,
    desc,
    reset() {
      selectResults.length = 0;
      db.select.mockClear();
      eq.mockClear();
      and.mockClear();
      gte.mockClear();
      desc.mockClear();
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
  desc: mockState.desc,
}));

type ModuleExports = typeof import("../../src/app/api/users/[username]/sources/route");

let GET: ModuleExports["GET"];

beforeAll(async () => {
  const routeModule = await import("../../src/app/api/users/[username]/sources/route");
  GET = routeModule.GET;
});

beforeEach(() => {
  mockState.reset();
});

describe("GET /api/users/[username]/sources", () => {
  it("aggregates sources and preserves a legacy null source", async () => {
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
        sourcesUsed: ["claude", "kilocode"],
        modelsUsed: ["claude-sonnet-4", "gpt-4.1"],
        updatedAt: new Date("2026-03-02T10:00:00.000Z"),
      },
      {
        id: "submission-2",
        sourceId: null,
        sourceName: null,
        totalTokens: 300,
        totalCost: "3.2500",
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        reasoningTokens: 0,
        submitCount: 1,
        dateStart: "2026-03-01",
        dateEnd: "2026-03-01",
        sourcesUsed: ["cursor"],
        modelsUsed: ["gpt-4.1"],
        updatedAt: new Date("2026-03-01T09:00:00.000Z"),
      },
    ]);
    mockState.pushSelectResult([
      {
        sourceId: "machine-a",
        sourceName: "Work MacBook",
        date: "2026-03-01",
        timestampMs: 1700000000000,
        tokens: 500,
        cost: "5.2500",
        inputTokens: 300,
        outputTokens: 200,
        sourceBreakdown: {
          claude: {
            tokens: 500,
            cost: 5.25,
            input: 300,
            output: 200,
            cacheRead: 50,
            cacheWrite: 10,
            reasoning: 5,
            messages: 2,
            models: {
              "claude-sonnet-4": {
                tokens: 500,
                cost: 5.25,
                input: 300,
                output: 200,
                cacheRead: 50,
                cacheWrite: 10,
                reasoning: 5,
                messages: 2,
              },
            },
          },
        },
      },
      {
        sourceId: null,
        sourceName: null,
        date: "2026-03-01",
        timestampMs: 1700000001000,
        tokens: 300,
        cost: "3.2500",
        inputTokens: 200,
        outputTokens: 100,
        sourceBreakdown: {
          cursor: {
            tokens: 300,
            cost: 3.25,
            input: 200,
            output: 100,
            cacheRead: 0,
            cacheWrite: 0,
            reasoning: 0,
            messages: 1,
            modelId: "gpt-4.1",
          },
        },
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3000/api/users/alice/sources"),
      { params: Promise.resolve({ username: "alice" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sources).toHaveLength(2);

    expect(body.sources[0]).toMatchObject({
      sourceId: "machine-a",
      sourceName: "Work MacBook",
      stats: {
        totalTokens: 1000,
        totalCost: 10.5,
        submissionCount: 2,
        activeDays: 1,
      },
      clients: ["claude", "kilo"],
      models: ["claude-sonnet-4", "gpt-4.1"],
    });

    expect(body.sources[1]).toMatchObject({
      sourceId: null,
      sourceName: "Legacy / Unknown device",
      stats: {
        totalTokens: 300,
        totalCost: 3.25,
        submissionCount: 1,
        activeDays: 1,
      },
      clients: ["cursor"],
      models: ["gpt-4.1"],
    });
  });

  it("returns 404 when the user does not exist", async () => {
    mockState.pushSelectResult([]);

    const response = await GET(
      new Request("http://localhost:3000/api/users/missing/sources"),
      { params: Promise.resolve({ username: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "User not found" });
  });
});
