import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default function DailyJoke(): import("react/jsx-runtime").JSX.Element {
  const [joke, setJoke] = useState("");

  useEffect(() => {
    const fetchJoke = async () => {
      if (!supabase) {
        setJoke("Joke unavailable");
        return;
      }

      const { data, error } = await supabase
        .from("current_joke")
        .select("joke_text")
        .single();

      if (!error && data) {
        setJoke(data.joke_text);
      }
    };

    fetchJoke();
  }, []);

  return (
    <div className="text-center text-lg font-medium">
      {joke || "Loading joke..."}
    </div>
  );
}
