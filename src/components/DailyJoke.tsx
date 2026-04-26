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
          .from("messages")
          .select("content")
          .eq("id", "current_joke")
          .maybeSingle();

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error("Daily joke request timed out"));
          }, JOKE_REQUEST_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([jokePromise, timeoutPromise]);

        if (!isMounted) return;

        if (error) {
          throw error;
        }

        const nextJoke = data?.content?.trim();
        setJoke(nextJoke || "No joke available today.");
      } catch (error) {
        if (!isMounted) return;
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
    };
  }, []);

  return (
    <div className="text-center text-lg font-medium">
      {isLoading ? "Loading joke..." : joke}
    </div>
  );
}
