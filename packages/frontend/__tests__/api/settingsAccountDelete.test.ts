import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const getSession = vi.fn();
  const clearSession = vi.fn();
  const revalidateTag = vi.fn();
  const revalidatePath = vi.fn();
  const eq = vi.fn((left: unknown, right: unknown) => ({
    kind: "eq",
    left,
    right,
  }));
  const returning = vi.fn(async () => {
    if (deleteError) {
      throw deleteError;
    }
    return deletedRows;
  });
  const where = vi.fn(() => ({
    returning,
  }));
  let deletedRows: Array<{ id: string }> = [];
  let deleteError: Error | null = null;

  const db = {
    delete: vi.fn(() => ({
      where,
    })),
  };

  return {
    getSession,
    clearSession,
    revalidateTag,
    revalidatePath,
    eq,
    db,
    where,
    reset() {
      getSession.mockReset();
      clearSession.mockReset();
      revalidateTag.mockReset();
      revalidatePath.mockReset();
      eq.mockClear();
      db.delete.mockClear();
      where.mockClear();
      returning.mockClear();
      deletedRows = [];
      deleteError = null;
    },
    setDeletedRows(rows: Array<{ id: string }>) {
      deletedRows = rows;
    },
    setDeleteError(error: Error | null) {
      deleteError = error;
    },
  };
});

vi.mock("next/cache", () => ({
  revalidateTag: mockState.revalidateTag,
  revalidatePath: mockState.revalidatePath,
}));

vi.mock("drizzle-orm", () => ({
  eq: mockState.eq,
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mockState.getSession,
  clearSession: mockState.clearSession,
}));

vi.mock("@/lib/db", () => ({
  db: mockState.db,
  users: {
    id: "users.id",
  },
}));

type ModuleExports = typeof import("../../src/app/api/settings/account/route");

let DELETE: ModuleExports["DELETE"];

beforeAll(async () => {
  const routeModule = await import("../../src/app/api/settings/account/route");
  DELETE = routeModule.DELETE;
});

beforeEach(() => {
  mockState.reset();
});

describe("DELETE /api/settings/account", () => {
  it("returns 401 when session is missing", async () => {
    mockState.getSession.mockResolvedValue(null);

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Not authenticated" });
    expect(mockState.db.delete).not.toHaveBeenCalled();
  });

  it("deletes user account and clears session", async () => {
    mockState.getSession.mockResolvedValue({
      id: "user-1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      isAdmin: false,
    });
    mockState.setDeletedRows([{ id: "user-1" }]);

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      deleted: true,
    });
    expect(mockState.db.delete).toHaveBeenCalledTimes(1);
    expect(mockState.eq).toHaveBeenCalledWith("users.id", "user-1");
    expect(mockState.clearSession).toHaveBeenCalledTimes(1);
    expect(mockState.revalidateTag).toHaveBeenCalledTimes(7);
    expect(mockState.revalidatePath).toHaveBeenCalledTimes(5);
    expect(mockState.revalidateTag).toHaveBeenNthCalledWith(1, "leaderboard", "max");
    expect(mockState.revalidateTag).toHaveBeenNthCalledWith(2, "user:alice", "max");
  });

  it("returns 404 when user row does not exist", async () => {
    mockState.getSession.mockResolvedValue({
      id: "user-1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      isAdmin: false,
    });
    mockState.setDeletedRows([]);

    const response = await DELETE();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "User not found" });
    expect(mockState.clearSession).not.toHaveBeenCalled();
  });

  it("returns 500 when deletion fails", async () => {
    mockState.getSession.mockResolvedValue({
      id: "user-1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      isAdmin: false,
    });
    mockState.setDeleteError(new Error("db unavailable"));

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to delete account",
    });
  });

  it("still succeeds when clearSession throws", async () => {
    mockState.getSession.mockResolvedValue({
      id: "user-1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      isAdmin: false,
    });
    mockState.setDeletedRows([{ id: "user-1" }]);
    mockState.clearSession.mockRejectedValue(new Error("cookie error"));

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      deleted: true,
    });
  });
});
