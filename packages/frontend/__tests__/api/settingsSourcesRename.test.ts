import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const getSession = vi.fn();
  const updateReturning = vi.fn();
  const revalidateTag = vi.fn();

  const db = {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: updateReturning,
        }),
      }),
    }),
  };

  return {
    getSession,
    updateReturning,
    revalidateTag,
    db,
    reset() {
      getSession.mockReset();
      updateReturning.mockReset();
      revalidateTag.mockReset();
    },
  };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: mockState.getSession,
}));

vi.mock("@/lib/db", () => ({
  db: mockState.db,
  submissions: {
    userId: Symbol("userId"),
    sourceId: Symbol("sourceId"),
    sourceName: Symbol("sourceName"),
    updatedAt: Symbol("updatedAt"),
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: mockState.revalidateTag,
}));

type ModuleExports = typeof import("../../src/app/api/settings/sources/[sourceId]/route");

let PATCH: ModuleExports["PATCH"];

beforeAll(async () => {
  const routeModule = await import(
    "../../src/app/api/settings/sources/[sourceId]/route"
  );
  PATCH = routeModule.PATCH;
});

beforeEach(() => {
  mockState.reset();
});

function buildRequest(body: unknown, { raw }: { raw?: string } = {}) {
  return new Request("http://localhost:3000/api/settings/sources/source:abc", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describe("PATCH /api/settings/sources/[sourceId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockState.getSession.mockResolvedValue(null);

    const response = await PATCH(buildRequest({ name: "Work" }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(401);
    expect(mockState.updateReturning).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid source id", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });

    const response = await PATCH(buildRequest({ name: "Work" }), {
      params: Promise.resolve({ sourceId: "source:%ZZ" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid source id" });
  });

  it("returns 400 when body is not JSON", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });

    const response = await PATCH(buildRequest(null, { raw: "not-json" }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(400);
  });

  it("rejects control characters in name", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });

    const response = await PATCH(buildRequest({ name: "Evil\u0000Name" }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(400);
    expect(mockState.updateReturning).not.toHaveBeenCalled();
  });

  it("renames a source and returns the updated row", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });
    mockState.updateReturning.mockResolvedValue([
      { sourceId: "abc", sourceName: "Work Laptop" },
    ]);

    const response = await PATCH(buildRequest({ name: "  Work Laptop  " }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      source: { sourceId: "abc", sourceName: "Work Laptop" },
    });
    expect(mockState.revalidateTag).toHaveBeenCalledWith("user:alice", "max");
  });

  it("allows clearing the name with null", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });
    mockState.updateReturning.mockResolvedValue([
      { sourceId: "abc", sourceName: null },
    ]);

    const response = await PATCH(buildRequest({ name: null }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source.sourceName).toBeNull();
  });

  it("treats an empty string as null", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });
    mockState.updateReturning.mockResolvedValue([
      { sourceId: "abc", sourceName: null },
    ]);

    const response = await PATCH(buildRequest({ name: "   " }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(200);
  });

  it("returns 404 when the source does not belong to the user", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });
    mockState.updateReturning.mockResolvedValue([]);

    const response = await PATCH(buildRequest({ name: "Work" }), {
      params: Promise.resolve({ sourceId: "source:abc" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Source not found" });
  });

  it("resolves __legacy__ to the unsourced row", async () => {
    mockState.getSession.mockResolvedValue({ id: "user-1", username: "alice" });
    mockState.updateReturning.mockResolvedValue([
      { sourceId: null, sourceName: "Legacy" },
    ]);

    const response = await PATCH(buildRequest({ name: "Legacy" }), {
      params: Promise.resolve({ sourceId: "__legacy__" }),
    });

    expect(response.status).toBe(200);
  });
});
