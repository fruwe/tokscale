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
  const isNull = vi.fn(() => "isNull");

  return {
    db,
    tables,
    eq,
    and,
    gte,
    desc,
    isNull,
    reset() {
      selectResults.length = 0;
      db.select.mockClear();
      eq.mockClear();
      and.mockClear();
      gte.mockClear();
      desc.mockClear();
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
  desc: mockState.desc,
  isNull: mockState.isNull,
}));

type ModuleExports = typeof import("../../src/app/api/users/[username]/sources/[sourceId]/route");

let GET: ModuleExports["GET"];

beforeAll(async () => {
  const routeModule = await import("../../src/app/api/users/[username]/sources/[sourceId]/route");
  GET = routeModule.GET;
});

beforeEach(() => {
  mockState.reset();
});

describe("GET /api/users/[username]/sources/[sourceId]", () => {
  it("returns a detailed view for a concrete source", async () => {
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
      new Request("http://localhost:3000/api/users/alice/sources/machine-a"),
      { params: Promise.resolve({ username: "alice", sourceId: "machine-a" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toMatchObject({
      sourceId: "machine-a",
      sourceKey: "machine-a",
      sourceName: "Work MacBook",
      stats: {
        totalTokens: 1000,
        totalCost: 10.5,
        submissionCount: 2,
        activeDays: 1,
      },
      clients: ["claude"],
      models: ["claude-sonnet-4"],
    });
    expect(body.source.contributions).toHaveLength(1);
  });

  it("maps __legacy__ to null source rows", async () => {
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
        id: "submission-legacy",
        sourceId: null,
        sourceName: null,
        totalTokens: 50,
        totalCost: "0.5000",
        inputTokens: 30,
        outputTokens: 20,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        reasoningTokens: 0,
        submitCount: 1,
        dateStart: "2026-03-01",
        dateEnd: "2026-03-01",
        sourcesUsed: ["cursor"],
        modelsUsed: ["gpt-4.1"],
        updatedAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);
    mockState.pushSelectResult([]);

    const response = await GET(
      new Request("http://localhost:3000/api/users/alice/sources/__legacy__"),
      { params: Promise.resolve({ username: "alice", sourceId: "__legacy__" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source.sourceId).toBeNull();
    expect(body.source.sourceKey).toBe("__legacy__");
    expect(body.source.sourceName).toBe("Legacy / Unknown device");
  });
});
