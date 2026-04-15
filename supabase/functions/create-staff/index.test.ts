import { assertEquals } from "jsr:@std/assert@^1.0.0";

import { buildCreateStaffHandler } from "./index.ts";

type FakeOptions = {
  caller: { id: string } | null;
  isAdmin?: boolean;
  createUserError?: { message: string } | null;
  createdUserId?: string;
};

function createFakeClient(options: FakeOptions) {
  const createdUserId = options.createdUserId ?? "new-user-1";
  const calls = {
    usersCreated: [] as Array<Record<string, unknown>>,
    profileUpdates: [] as Array<Record<string, unknown>>,
    roleUpserts: [] as Array<Record<string, unknown>>,
  };

  const client = {
    auth: {
      getUser: async (_token: string) => ({ data: { user: options.caller } }),
      admin: {
        createUser: async (params: Record<string, unknown>) => {
          calls.usersCreated.push(params);
          if (options.createUserError) {
            return { data: { user: null }, error: options.createUserError };
          }
          return { data: { user: { id: createdUserId } }, error: null };
        },
      },
    },
    from: (table: string) => {
      if (table === "user_roles") {
        return {
          select: (_columns: string) => ({
            eq: (_column1: string, _value1: string) => ({
              eq: (_column2: string, _value2: string) => ({
                maybeSingle: async () => ({
                  data: options.isAdmin === false ? null : { role: "admin" },
                }),
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
  return new Request("http://localhost/create-staff", {
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
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = new Request("http://localhost/create-staff", { method: "POST", body: "{}" });
  const res = await handler(req);

  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: "Missing or invalid authorization header" });
});

Deno.test("returns 403 when caller is not admin", async () => {
  const { client } = createFakeClient({ caller: { id: "user-1" }, isAdmin: false });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ email: "new@example.com", full_name: "New Staff" });
  const res = await handler(req);

  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: "Admin access required" });
});

Deno.test("returns 400 when email is missing", async () => {
  const { client } = createFakeClient({ caller: { id: "admin-1" } });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ full_name: "New Staff" });
  const res = await handler(req);

  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: "Email and full name are required" });
});

Deno.test("returns 400 when full_name is missing", async () => {
  const { client } = createFakeClient({ caller: { id: "admin-1" } });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ email: "new@example.com" });
  const res = await handler(req);

  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: "Email and full name are required" });
});

Deno.test("returns 400 when user creation fails", async () => {
  const { client } = createFakeClient({
    caller: { id: "admin-1" },
    createUserError: { message: "Email already registered" },
  });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ email: "existing@example.com", full_name: "Existing User" });
  const res = await handler(req);

  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: "Email already registered" });
});

Deno.test("creates staff user and upserts staff role", async () => {
  const { client, calls } = createFakeClient({
    caller: { id: "admin-1" },
    createdUserId: "new-staff-id",
  });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ email: "staff@example.com", full_name: "Staff Member" });
  const res = await handler(req);

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.user_id, "new-staff-id");
  assertEquals(typeof body.temp_password, "string");
  assertEquals(calls.roleUpserts, [{ user_id: "new-staff-id", role: "staff" }]);
});

Deno.test("creates admin user and upserts admin role", async () => {
  const { client, calls } = createFakeClient({
    caller: { id: "admin-1" },
    createdUserId: "new-admin-id",
  });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ email: "admin@example.com", full_name: "Admin User", role: "admin" });
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(calls.roleUpserts, [{ user_id: "new-admin-id", role: "admin" }]);
});

Deno.test("updates profile with phone when provided", async () => {
  const { client, calls } = createFakeClient({
    caller: { id: "admin-1" },
    createdUserId: "new-staff-id",
  });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({
    email: "staff@example.com",
    full_name: "Staff Member",
    phone: "0400 000 000",
  });
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(calls.profileUpdates, [{ phone: "0400 000 000" }]);
});

Deno.test("does not update profile when phone is not provided", async () => {
  const { client, calls } = createFakeClient({
    caller: { id: "admin-1" },
    createdUserId: "new-staff-id",
  });
  const handler = buildCreateStaffHandler(() => client as never, env);

  const req = makeRequest({ email: "staff@example.com", full_name: "Staff Member" });
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(calls.profileUpdates, []);
});
