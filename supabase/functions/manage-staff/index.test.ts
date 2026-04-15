import { assertEquals } from "jsr:@std/assert@^1.0.0";

import { buildManageStaffHandler } from "./index.ts";

type FakeOptions = {
  caller: { id: string } | null;
  isAdmin?: boolean;
};

function createFakeClient(options: FakeOptions) {
  const calls = {
    profileUpdates: [] as Array<Record<string, unknown>>,
    roleUpserts: [] as Array<Record<string, unknown>>,
  };

  const client = {
    auth: {
      getUser: async (_token: string) => ({ data: { user: options.caller } }),
    },
    from: (table: string) => {
      if (table === "user_roles") {
        return {
          select: (_columns: string) => ({
            eq: (_column1: string, _value1: string) => ({
              eq: async (_column2: string, _value2: string) => ({
                data: options.isAdmin === false ? null : { role: "admin" },
              }),
            }),
          }),
          upsert: async (row: Record<string, unknown>, _config: { onConflict: string }) => {
            calls.roleUpserts.push(row);
            return { error: null };
          },
        };
      }

      if (table === "profiles") {
        return {
          update: (values: Record<string, unknown>) => ({
            eq: async (_column: string, _value: string) => {
              calls.profileUpdates.push(values);
              return { error: null };
            },
          }),
        };
      }

      throw new Error(`Unsupported table in fake client: ${table}`);
    },
  };

  return { client, calls };
}

function makeRequest(body: unknown, token = "test-token") {
  return new Request("http://localhost/manage-staff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const env = {
  get: (key: string) => {
    if (key === "SUPABASE_URL") return "https://example.supabase.co";
    if (key === "SUPABASE_SERVICE_ROLE_KEY") return "service-role-key";
    return undefined;
  },
};

Deno.test("returns 401 when authorization header is missing", async () => {
  const { client } = createFakeClient({ caller: { id: "admin-1" } });
  const handler = buildManageStaffHandler(() => client as never, env);

  const req = new Request("http://localhost/manage-staff", { method: "POST", body: "{}" });
  const res = await handler(req);

  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: "Missing or invalid authorization header" });
});

Deno.test("returns 403 when caller is not admin", async () => {
  const { client } = createFakeClient({ caller: { id: "user-1" }, isAdmin: false });
  const handler = buildManageStaffHandler(() => client as never, env);

  const req = makeRequest({ action: "update", user_id: "user-2", full_name: "Alex" });
  const res = await handler(req);

  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: "Admin access required" });
});

Deno.test("returns 400 when update has no fields", async () => {
  const { client } = createFakeClient({ caller: { id: "admin-1" } });
  const handler = buildManageStaffHandler(() => client as never, env);

  const req = makeRequest({ action: "update", user_id: "user-2" });
  const res = await handler(req);

  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: "No updates provided" });
});

Deno.test("upserts role on update action", async () => {
  const { client, calls } = createFakeClient({ caller: { id: "admin-1" } });
  const handler = buildManageStaffHandler(() => client as never, env);

  const req = makeRequest({ action: "update", user_id: "user-2", role: "staff" });
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(await res.json(), { success: true });
  assertEquals(calls.roleUpserts, [{ user_id: "user-2", role: "staff" }]);
});

Deno.test("returns 400 when toggle_active receives non-boolean", async () => {
  const { client } = createFakeClient({ caller: { id: "admin-1" } });
  const handler = buildManageStaffHandler(() => client as never, env);

  const req = makeRequest({ action: "toggle_active", user_id: "user-2", active: "true" });
  const res = await handler(req);

  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: "active must be a boolean" });
});
