import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EnvProvider = {
  get(key: string): string | undefined;
};

type CreateClientLike = typeof createClient;

export function buildCreateStaffHandler(
  createClientImpl: CreateClientLike = createClient,
  env: EnvProvider = Deno.env,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = env.get("SUPABASE_URL");
      const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) {
        return new Response(JSON.stringify({ error: "Server configuration is missing" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClientImpl(supabaseUrl, serviceRoleKey);

      // Validate the caller's token and confirm they are an admin
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller } } = await adminClient.auth.getUser(token);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let body: { email?: string; full_name?: string; phone?: string; role?: string };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { email, full_name, phone, role } = body;

      if (!email || !full_name) {
        return new Response(JSON.stringify({ error: "Email and full name are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a temporary password with guaranteed complexity requirements.
      // Rejection sampling ensures uniform distribution (no modulo bias).
      const pool = crypto.getRandomValues(new Uint8Array(256));
      let pi = 0;

      const UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const LOWER   = "abcdefghijklmnopqrstuvwxyz";
      const DIGIT   = "0123456789";
      const SPECIAL = "!@#$%^&*";
      const ALL = UPPER + LOWER + DIGIT + SPECIAL;

      const pick = (chars: string): string => {
        const limit = Math.floor(256 / chars.length) * chars.length;
        while (pi < pool.length) {
          const b = pool[pi++];
          if (b < limit) return chars[b % chars.length];
        }
        // Unreachable: 256-byte pool is more than sufficient for <= 16 picks.
        return chars[0];
      };

      // 15 characters: 1 guaranteed from each required set, 12 from the full set.
      const tempPassword = [
        pick(UPPER),
        pick(DIGIT),
        pick(SPECIAL),
        ...Array.from({ length: 12 }, () => pick(ALL)),
      ].join("");

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile with phone if provided
      if (phone) {
        await adminClient
          .from("profiles")
          .update({ phone })
          .eq("user_id", newUser.user.id);
      }

      // Assign role — upsert handles the case where a previous partial attempt
      // already inserted a role for this user (onConflict matches user_id unique key).
      const staffRole = role === "admin" ? "admin" : "staff";
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: newUser.user.id, role: staffRole }, { onConflict: "user_id" });

      if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUser.user.id,
          temp_password: tempPassword,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  };
}

export const handleCreateStaff = buildCreateStaffHandler();

if (import.meta.main) {
  Deno.serve(handleCreateStaff);
}
