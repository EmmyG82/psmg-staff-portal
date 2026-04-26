import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const JOKE_REQUEST_TIMEOUT_MS = 8000;

export default function DailyJoke(): import("react/jsx-runtime").JSX.Element {
  const [joke, setJoke] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;

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

        const nextJoke = data?.joke_text?.trim();
        setJoke(nextJoke || "No joke available today.");
      } catch (error) {
        console.error("Failed to load daily joke", error);
        setJoke("Could not load joke.");
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
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
