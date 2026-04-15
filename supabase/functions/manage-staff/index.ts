import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ManageStaffPayload = {
  action?: "update" | "toggle_active";
  user_id?: string;
  full_name?: string;
  phone?: string;
  role?: "admin" | "staff";
  active?: boolean;
};

type EnvProvider = {
  get(key: string): string | undefined;
};

type CreateClientLike = typeof createClient;

export function buildManageStaffHandler(
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

      // Validate the caller's token using the admin client
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

      let payload: ManageStaffPayload;
      try {
        payload = (await req.json()) as ManageStaffPayload;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { action, user_id, full_name, phone, role, active } = payload;

      if (!user_id || !action) {
        return new Response(JSON.stringify({ error: "user_id and action are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update") {
        // Update profile
        const profileUpdate: Record<string, unknown> = {};
        if (full_name !== undefined) profileUpdate.full_name = full_name;
        if (phone !== undefined) profileUpdate.phone = phone;

        if (role !== undefined && role !== "admin" && role !== "staff") {
          return new Response(JSON.stringify({ error: "role must be admin or staff" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (Object.keys(profileUpdate).length === 0 && role === undefined) {
          return new Response(JSON.stringify({ error: "No updates provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await adminClient
            .from("profiles")
            .update(profileUpdate)
            .eq("user_id", user_id);
          if (profileError) throw new Error(profileError.message);
        }

        // Update role if provided
        if (role !== undefined) {
          const { error: roleError } = await adminClient
            .from("user_roles")
            .upsert({ user_id, role }, { onConflict: "user_id" });
          if (roleError) throw new Error(roleError.message);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "toggle_active") {
        if (typeof active !== "boolean") {
          return new Response(JSON.stringify({ error: "active must be a boolean" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const newActive = active !== undefined ? active : false;

        const { error } = await adminClient
          .from("profiles")
          .update({ active: newActive })
          .eq("user_id", user_id);
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ success: true, active: newActive }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  };
}

export const handleManageStaff = buildManageStaffHandler();

if (import.meta.main) {
  Deno.serve(handleManageStaff);
}

