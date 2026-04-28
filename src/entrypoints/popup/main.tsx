import { createRoot } from "react-dom/client";
import "@/ui/theme.css";

function Popup() {
  return (
    <div className="luster-root w-[280px] p-4 bg-luster-bg">
      <div className="text-luster-accent font-serif text-lg mb-1">Luster</div>
      <div className="text-luster-muted text-xs">
        Phase 1 stub. Open a Google Doc, Notion page, or Substack draft.
      </div>
    </div>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<Popup />);
