declare module "https://esm.sh/@supabase/supabase-js@2.49.4" {
  export * from "@supabase/supabase-js";
}

declare module "npm:web-push@3.6.7" {
  import webPush from "web-push";
  export default webPush;
}

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  namespace env {
    function get(key: string): string | undefined;
  }
}