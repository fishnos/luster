import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import "@/ui/theme.css";
import { Mark } from "@/ui/components/Mark";
import { GlassCard } from "@/ui/components/GlassCard";
import { AmbientBackdrop } from "@/ui/components/AmbientBackdrop";
import { WelcomeFlow } from "@/ui/welcome/WelcomeFlow";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { createFirstRunStore } from "@/core/firstRun";
import { blurFadeIn, staggerContainer } from "@/ui/motion/staggered";
import type { ProviderId } from "@/core/types";
import { cn } from "@/ui/cn";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
};

const SUPPORTED_HOSTS: { label: string; matcher: RegExp }[] = [
  { label: "Google Docs", matcher: /^https:\/\/docs\.google\.com\/document\// },
  {
    label: "Notion",
    matcher: /^https:\/\/(www\.notion\.so|.+\.notion\.site)\//,
  },
  {
    label: "Substack draft",
    matcher: /^https:\/\/.+\.substack\.com\/publish\//,
  },
  { label: "Medium", matcher: /^https:\/\/(.+\.)?medium\.com\// },
  { label: "Ghost", matcher: /^https:\/\/.+\.ghost\.io\// },
];

const storage = createBrowserLocalStorage();
const keyVault = createKeyVault(storage);
const firstRun = createFirstRunStore(storage);

function Popup() {
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    void firstRun.hasSeenWelcome().then(setWelcomeSeen);
  }, []);

  async function completeWelcome(): Promise<void> {
    await firstRun.markWelcomeSeen();
    setWelcomeSeen(true);
  }

  if (welcomeSeen === null) {
    return <Shell />;
  }

  return (
    <Shell>
      {welcomeSeen ? (
        <MainView />
      ) : (
        <WelcomeFlow onComplete={() => void completeWelcome()} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="luster-root relative w-[340px] min-h-[360px] overflow-hidden bg-luster-ink0">
      <AmbientBackdrop />
      <div className="relative z-10 p-4">
        <GlassCard className="overflow-hidden">{children}</GlassCard>
      </div>
    </div>
  );
}

function MainView() {
  const [activeProvider, setActiveProvider] = useState<ProviderId>("gemini");
  const [hasKey, setHasKey] = useState(false);
  const [tabSupported, setTabSupported] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void hydrate();
    async function hydrate(): Promise<void> {
      const provider = await keyVault.getActiveProvider();
      setActiveProvider(provider);
      setHasKey(await keyVault.hasApiKey(provider));
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const url = tabs[0]?.url ?? "";
        setTabSupported(
          SUPPORTED_HOSTS.some((entry) => entry.matcher.test(url)),
        );
      } catch {
        setTabSupported(false);
      }
      setLoaded(true);
    }
  }, []);

  function openOptions(): void {
    browser.runtime.openOptionsPage();
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4 p-5"
    >
      <motion.div variants={blurFadeIn} className="flex items-center gap-3">
        <Mark size={28} />
        <div className="flex flex-col">
          <div className="luster-display text-[16px] leading-none text-luster-ink">
            Luster
          </div>
          <div className="text-[11px] mt-1 text-luster-muted">
            Editor for your prose, in your editor.
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={blurFadeIn}
        className="flex flex-col gap-2.5 rounded-lg border border-luster-border bg-white/[0.02] px-3.5 py-3"
      >
        {!loaded ? (
          <span className="text-[12px] text-luster-muted">Loading…</span>
        ) : (
          <>
            <Row
              label="AI"
              tone={hasKey ? "ok" : "muted"}
              value={
                hasKey
                  ? `Connected · ${PROVIDER_LABEL[activeProvider]}`
                  : "Not connected"
              }
            />
            <div className="luster-divider" />
            <Row
              label="This page"
              tone={tabSupported ? "ok" : "muted"}
              value={
                tabSupported ? "Supported editor" : "Open a supported editor"
              }
            />
          </>
        )}
      </motion.div>

      <motion.button
        variants={blurFadeIn}
        type="button"
        onClick={openOptions}
        className={cn(
          "luster-press group flex h-10 w-full items-center justify-center gap-2 rounded-lg",
          "border border-luster-border bg-white/[0.04] text-[13px] font-medium text-luster-ink",
          "transition-colors hover:bg-white/[0.08]",
        )}
      >
        {hasKey ? "Open settings" : "Connect to AI"}
        <span
          aria-hidden
          className="text-luster-muted transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </motion.button>

      <motion.p
        variants={blurFadeIn}
        className="text-[10px] leading-snug text-luster-faint"
      >
        Once connected, the panel auto-launches inside Google Docs, Notion,
        Substack, Medium, and Ghost editors.
      </motion.p>
    </motion.div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="luster-eyebrow">{label}</span>
      <span
        className={cn(
          "text-[12px] tracking-[-0.005em]",
          tone === "ok" ? "text-luster-ink-soft" : "text-luster-muted",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
