// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// vi.mock does not reach CommonJS require. index.js destructures getDatabase
// when it loads, so the spy goes on before index.js is required.
const require = createRequire(import.meta.url);
const cosmos = require("../shared/cosmos");
let database;
vi.spyOn(cosmos, "getDatabase").mockImplementation(() => database);
const handler = require("./index.js");

const principal = (p) => Buffer.from(JSON.stringify(p)).toString("base64");
const ADMIN = principal({ identityProvider: "github", userId: "gh-123", userRoles: ["admin"] });
const JSON_TYPE = { "content-type": "application/json" };

/**
 * A container holding `rows`. Write failures come from plain throwing
 * functions, not rejected vi.fn mocks, which vitest 1.6 reports as unhandled.
 */
function fakeContainer(rows, { replaceError, createError } = {}) {
  const writes = { created: [], replaced: [], deleted: [] };
  const container = {
    items: {
      query: (spec) => ({
        fetchAll: async () => {
          const id = spec.parameters.find((p) => p.name === "@id")?.value;
          return { resources: id === undefined ? rows : rows.filter((r) => r.id === id) };
        },
      }),
      create: async (doc) => {
        if (createError) throw createError;
        writes.created.push(doc);
        return { resource: { ...doc, _etag: "etag-new" } };
      },
    },
    item: (id, partitionKey) => ({
      replace: async (doc, options) => {
        if (replaceError) throw replaceError;
        writes.replaced.push({ id, partitionKey, doc, options });
        return { resource: doc };
      },
      delete: async () => {
        writes.deleted.push({ id, partitionKey });
        return {};
      },
    }),
  };
  return { container, writes };
}

function useContainer(rows, errors) {
  const fake = fakeContainer(rows, errors);
  database = { container: () => fake.container };
  return fake.writes;
}

async function call(
  method,
  { collection, id, headers = { "x-ms-client-principal": ADMIN }, ...rest } = {},
) {
  const context = { bindingData: { collection, id }, log: { error: vi.fn(), warn: vi.fn() } };
  await handler(context, { method, headers, query: {}, ...rest });
  const { status, body } = context.res;
  return { status, body: body ? JSON.parse(body) : undefined };
}

const project = {
  id: "p1",
  title: "Shop",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  _etag: "etag-1",
};

describe("/api/manage", () => {
  const saved = {};
  beforeEach(() => {
    saved.ids = process.env.ADMIN_USER_IDS;
    saved.email = process.env.ADMIN_EMAIL;
    process.env.ADMIN_USER_IDS = "gh-123";
    process.env.ADMIN_EMAIL = "admin@example.com";
    useContainer([project]);
  });
  afterEach(() => {
    for (const [key, name] of [
      ["ids", "ADMIN_USER_IDS"],
      ["email", "ADMIN_EMAIL"],
    ]) {
      if (saved[key] === undefined) delete process.env[name];
      else process.env[name] = saved[key];
    }
  });

  describe("access", () => {
    it("refuses a request with no session", async () => {
      expect((await call("GET", { collection: "projects", headers: {} })).status).toBe(401);
    });

    it("refuses a signed-in user whose id isn't in ADMIN_USER_IDS, even claiming the role", async () => {
      const other = principal({
        identityProvider: "github",
        userId: "gh-999",
        userRoles: ["admin"],
      });
      const r = await call("GET", {
        collection: "projects",
        headers: { "x-ms-client-principal": other },
      });
      expect(r.status).toBe(401);
    });

    it("refuses the admin's cross-site request", async () => {
      const r = await call("GET", {
        collection: "projects",
        headers: { "x-ms-client-principal": ADMIN, "sec-fetch-site": "cross-site" },
      });
      expect(r.status).toBe(403);
    });
  });

  describe("routing", () => {
    it.each(["nope", "analytics", "constructor"])("returns 404 for collection %s", async (name) => {
      expect((await call("GET", { collection: name })).status).toBe(404);
    });

    it("refuses to delete a payment and leaves it in place", async () => {
      const writes = useContainer([{ id: "pay1", _etag: "e" }]);
      const r = await call("DELETE", { collection: "payments", id: "pay1" });
      expect(r.status).toBe(405);
      expect(writes.deleted).toEqual([]);
    });

    it("refuses to change a payment and leaves it in place", async () => {
      const writes = useContainer([{ id: "pay1", _etag: "e" }]);
      const r = await call("PATCH", {
        collection: "payments",
        id: "pay1",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { status: "success" },
      });
      expect(r.status).toBe(405);
      expect(writes.replaced).toEqual([]);
    });

    it("refuses to delete an invoice", async () => {
      const writes = useContainer([{ id: "inv1", _etag: "e" }]);
      const r = await call("DELETE", { collection: "invoices", id: "inv1" });
      expect(r.status).toBe(405);
      expect(writes.deleted).toEqual([]);
    });

    it("refuses to archive an invoice, which goes through /api/quote-admin", async () => {
      const writes = useContainer([{ id: "inv1", status: "paid", _etag: "e" }]);
      const r = await call("PATCH", {
        collection: "invoices",
        id: "inv1",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { archivedAt: "2026-10-17T00:00:00.000Z" },
      });
      expect(r.status).toBe(405);
      expect(writes.replaced).toEqual([]);
    });

    it("still edits an invoice", async () => {
      const writes = useContainer([{ id: "inv1", status: "sent", _etag: "e" }]);
      const r = await call("PATCH", {
        collection: "invoices",
        id: "inv1",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { status: "paid" },
      });
      expect(r).toMatchObject({ status: 200, body: { status: "paid" } });
      expect(writes.replaced).toHaveLength(1);
    });

    it("refuses a PATCH that isn't JSON", async () => {
      const writes = useContainer([project]);
      const r = await call("PATCH", {
        collection: "projects",
        id: "p1",
        headers: { "x-ms-client-principal": ADMIN, "content-type": "text/plain" },
        body: { title: "x" },
      });
      expect(r.status).toBe(415);
      expect(writes.replaced).toEqual([]);
    });

    it("refuses a POST that isn't JSON before it reaches the handler's own check", async () => {
      const writes = useContainer([]);
      const r = await call("POST", {
        collection: "projects",
        headers: { "x-ms-client-principal": ADMIN, "content-type": "text/plain" },
        body: { title: "x" },
      });
      // requireAdmin's CSRF check refuses a non-JSON POST first.
      expect(r.status).toBe(403);
      expect(writes.created).toEqual([]);
    });

    it("returns 404 for a missing id", async () => {
      expect((await call("GET", { collection: "projects", id: "gone" })).status).toBe(404);
    });
  });

  describe("reads", () => {
    it("lists every row in the Appwrite shape", async () => {
      useContainer([project, { ...project, id: "p2", title: "Blog" }]);
      const r = await call("GET", { collection: "projects" });
      expect(r.status).toBe(200);
      expect(r.body.total).toBe(2);
      expect(r.body.documents[0]).toEqual({
        $id: "p1",
        $createdAt: project.createdAt,
        $updatedAt: project.updatedAt,
        title: "Shop",
      });
    });

    it("returns one row by id", async () => {
      const r = await call("GET", { collection: "projects", id: "p1" });
      expect(r).toMatchObject({ status: 200, body: { $id: "p1", title: "Shop" } });
    });
  });

  describe("writes", () => {
    it("creates a row with a server-assigned id, ignoring the one sent", async () => {
      const writes = useContainer([]);
      const r = await call("POST", {
        collection: "projects",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { $id: "mine", id: "mine", title: "New" },
      });
      expect(r.status).toBe(201);
      expect(r.body.title).toBe("New");
      expect(r.body.$id).toMatch(/^[0-9a-f]{20}$/);
      expect(writes.created[0].id).toBe(r.body.$id);
    });

    it("merges a PATCH and replaces only if the row is unchanged", async () => {
      const writes = useContainer([project]);
      const r = await call("PATCH", {
        collection: "projects",
        id: "p1",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { title: "Renamed" },
      });
      expect(r).toMatchObject({ status: 200, body: { $id: "p1", title: "Renamed" } });
      expect(writes.replaced[0].options).toEqual({
        accessCondition: { type: "IfMatch", condition: "etag-1" },
      });
    });

    it("refuses to move a row to another partition", async () => {
      const video = { id: "v1", projectId: "p1", _etag: "e" };
      const writes = useContainer([video]);
      const r = await call("PATCH", {
        collection: "project_videos",
        id: "v1",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { projectId: "p2" },
      });
      expect(r).toMatchObject({ status: 400, body: { error: "projectId can't be changed" } });
      expect(writes.replaced).toEqual([]);
    });

    it("reports a concurrent edit (Cosmos 412) as a 409", async () => {
      useContainer([project], {
        replaceError: Object.assign(new Error("precondition"), { code: 412 }),
      });
      const r = await call("PATCH", {
        collection: "projects",
        id: "p1",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { title: "Renamed" },
      });
      expect(r).toMatchObject({
        status: 409,
        body: { error: expect.stringMatching(/changed meanwhile/) },
      });
    });

    it("reports a duplicate (Cosmos 409) as a 409", async () => {
      useContainer([], { createError: Object.assign(new Error("conflict"), { code: 409 }) });
      const r = await call("POST", {
        collection: "projects",
        headers: { "x-ms-client-principal": ADMIN, ...JSON_TYPE },
        body: { title: "New" },
      });
      expect(r).toMatchObject({ status: 409, body: { error: expect.stringMatching(/duplicate/) } });
    });

    it("deletes a row from its partition", async () => {
      const writes = useContainer([project]);
      expect((await call("DELETE", { collection: "projects", id: "p1" })).status).toBe(204);
      expect(writes.deleted).toEqual([{ id: "p1", partitionKey: "p1" }]);
    });
  });
});
