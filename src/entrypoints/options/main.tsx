import { createRoot } from "react-dom/client";
import "@/ui/theme.css";

function Options() {
  return (
    <div className="luster-root min-h-screen bg-luster-bg p-8">
      <div className="max-w-2xl">
        <h1 className="text-luster-accent font-serif text-2xl mb-2">Luster</h1>
        <p className="text-luster-muted text-sm mb-6">
          Settings page. BYOK key vault, model picker, and history live here
          from Phase 4 onward.
        </p>
        <div className="rounded-md border border-luster-border bg-luster-panel p-4 text-luster-muted text-xs">
          Phase 1 scaffold. No settings to configure yet.
        </div>
      </div>
    </div>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<Options />);
