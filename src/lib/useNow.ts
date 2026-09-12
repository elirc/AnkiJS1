import { useEffect, useState } from "react";

// Due counts drift by the minute at most, and each tick re-reads the library.
export function useNow(interval = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, interval);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [interval]);
  return now;
}
