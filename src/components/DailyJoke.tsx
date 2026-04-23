import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function DailyJoke() {
  const [joke, setJoke] = useState("");

  useEffect(() => {
    const fetchJoke = async () => {
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
