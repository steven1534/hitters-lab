import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("siteContent", () => {
  it("getAll returns a record object (public access)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.siteContent.getAll();
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
  });

  it("update saves and persists a content override (admin only)", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const testKey = `test.inline.${Date.now()}`;

    const updateResult = await adminCaller.siteContent.update({
      contentKey: testKey,
      value: "Hello World",
    });
    expect(updateResult).toEqual({ success: true });

    // Verify the value was persisted
    const all = await adminCaller.siteContent.getAll();
    expect(all[testKey]).toBe("Hello World");
  });

  it("update overwrites existing value for the same key", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const testKey = `test.overwrite.${Date.now()}`;

    await adminCaller.siteContent.update({ contentKey: testKey, value: "First" });
    await adminCaller.siteContent.update({ contentKey: testKey, value: "Second" });

    const all = await adminCaller.siteContent.getAll();
    expect(all[testKey]).toBe("Second");
  });

  it("bulkUpdate saves multiple entries at once", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const ts = Date.now();

    const result = await adminCaller.siteContent.bulkUpdate({
      entries: [
        { contentKey: `test.bulk1.${ts}`, value: "Bulk A" },
        { contentKey: `test.bulk2.${ts}`, value: "Bulk B" },
      ],
    });
    expect(result).toEqual({ success: true });

    const all = await adminCaller.siteContent.getAll();
    expect(all[`test.bulk1.${ts}`]).toBe("Bulk A");
    expect(all[`test.bulk2.${ts}`]).toBe("Bulk B");
  });

  it("rejects update from non-admin user", async () => {
    const userCaller = appRouter.createCaller(createUserContext());
    await expect(
      userCaller.siteContent.update({ contentKey: "test.forbidden", value: "nope" })
    ).rejects.toThrow();
  });

  it("rejects update from unauthenticated user", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());
    await expect(
      publicCaller.siteContent.update({ contentKey: "test.forbidden", value: "nope" })
    ).rejects.toThrow();
  });

  it("reset deletes a content override (admin only)", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const testKey = `test.reset.${Date.now()}`;

    // Create an override
    await adminCaller.siteContent.update({ contentKey: testKey, value: "Override" });
    let all = await adminCaller.siteContent.getAll();
    expect(all[testKey]).toBe("Override");

    // Reset it
    const result = await adminCaller.siteContent.reset({ contentKey: testKey });
    expect(result).toEqual({ success: true });

    // Verify it's gone
    all = await adminCaller.siteContent.getAll();
    expect(all[testKey]).toBeUndefined();
  });

  it("rejects reset from non-admin user", async () => {
    const userCaller = appRouter.createCaller(createUserContext());
    await expect(
      userCaller.siteContent.reset({ contentKey: "test.forbidden" })
    ).rejects.toThrow();
  });
});
