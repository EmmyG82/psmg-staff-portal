import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const JOKE_REQUEST_TIMEOUT_MS = 8000;

export default function DailyJoke(): import("react/jsx-runtime").JSX.Element {
  const [joke, setJoke] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let safetyTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;
    let isSettled = false;

    safetyTimeoutId = setTimeout(() => {
      if (!isMounted || isSettled) {
        return;
      }

      controller.abort();
      setJoke("Could not load joke.");
      setIsLoading(false);
    }, JOKE_REQUEST_TIMEOUT_MS + 500);

    const fetchJoke = async () => {
      try {
        const jokePromise = supabase
          .from("current_joke")
          .select("joke_text")
          .maybeSingle()
          .abortSignal(controller.signal);

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error("Daily joke request timed out"));
          }, JOKE_REQUEST_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([jokePromise, timeoutPromise]);

        if (error) {
          throw error;
        }

        // TODO(@makeAnIssue): Dashboard reports occasional loading hang and false
        // "No joke available today." fallback; verify RPC/data availability and
        // fallback criteria so valid jokes are not dropped.
        const nextJoke = data?.joke_text?.trim();
        setJoke(nextJoke || "No joke available today.");
      } catch (error) {
        console.error("Failed to load daily joke", error);
        setJoke("Could not load joke.");
      } finally {
        isSettled = true;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (safetyTimeoutId) {
          clearTimeout(safetyTimeoutId);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchJoke();

    return () => {
      isMounted = false;
      controller.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (safetyTimeoutId) {
        clearTimeout(safetyTimeoutId);
      }
    };
  }, []);

  return (
    <div className="text-center text-lg font-medium">
      {isLoading ? "Loading joke..." : joke}
    </div>
  );
}
