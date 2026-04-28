import { createRoot } from "react-dom/client";
import "@/ui/theme.css";
import { Mark } from "@/ui/components/Mark";
import { InlineSettings } from "@/ui/InlineSettings";

function Options() {
  return (
    <div className="luster-root min-h-screen bg-luster-surface flex justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-5">
        <header className="flex items-center gap-3">
          <Mark size={32} />
          <div>
            <h1 className="luster-serif text-luster-ink text-2xl leading-none">
              Luster
            </h1>
            <p className="text-luster-muted text-[12px] mt-1">
              Settings · same controls as inside the writing panel.
            </p>
          </div>
        </header>

        <InlineSettings
          onBack={() => window.close()}
          onConnectionChange={() => {}}
          onAutoLaunchChange={() => {}}
          onDefaultModeChange={() => {}}
        />
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Options />);
