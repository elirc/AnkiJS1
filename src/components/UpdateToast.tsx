import { useEffect, useState } from "react";
import { hasAppUpdate } from "../lib/appUpdate";

export function UpdateToast() {
  const [visible, setVisible] = useState(hasAppUpdate);
  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener("recall:update-available", show);
    if (hasAppUpdate()) show();
    return () => window.removeEventListener("recall:update-available", show);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-4 bottom-24 z-40 rounded-xl border border-line bg-surface p-3 text-sm shadow-lg md:bottom-4 md:left-auto md:w-80">
      <div className="flex items-center gap-3">
        <span className="text-text">Update available</span>
        <button
          className="ml-auto min-h-11 rounded-lg px-3 py-2 font-semibold text-primary transition hover:bg-primary/10"
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("recall:apply-update"))
          }
        >
          Reload
        </button>
      </div>
    </div>
  );
}
