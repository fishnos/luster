import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import "@/ui/theme.css";
import { Mark } from "@/ui/components/Mark";
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

  return (
    <Shell>
      {welcomeSeen === null ? null : welcomeSeen ? (
        <MainView />
      ) : (
        <WelcomeFlow onComplete={() => void completeWelcome()} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="luster-root relative w-[340px] min-h-[320px] overflow-hidden bg-luster-ink0">
      <AmbientBackdrop />
      <div className="relative z-10">{children}</div>
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
      className="flex flex-col gap-7 px-6 py-7"
    >
      <motion.div variants={blurFadeIn} className="flex items-center gap-3">
        <Mark size={26} rounded={false} />
        <span className="luster-display text-[18px] leading-none">Luster</span>
      </motion.div>

      <motion.div variants={blurFadeIn} className="flex flex-col gap-4">
        <Field
          label="Provider"
          value={loaded ? (hasKey ? PROVIDER_LABEL[activeProvider] : "—") : "…"}
          dim={!hasKey}
        />
        <Field
          label="Page"
          value={
            loaded
              ? tabSupported
                ? "Supported editor"
                : "No editor here"
              : "…"
          }
          dim={!tabSupported}
        />
      </motion.div>

      <motion.button
        variants={blurFadeIn}
        type="button"
        onClick={openOptions}
        className={cn(
          "luster-press group inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-luster-ink",
          "border-b border-transparent hover:border-luster-ink transition-colors pb-0.5",
        )}
      >
        {hasKey ? "Open settings" : "Connect to AI"}
        <ArrowRight
          size={13}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </motion.button>

      <motion.p
        variants={blurFadeIn}
        className="text-[11px] leading-relaxed text-luster-faint"
      >
        Auto-launches inside Google Docs, Notion, Substack, Medium, Ghost.
      </motion.p>
    </motion.div>
  );
}

function Field({
  label,
  value,
  dim,
}: {
  label: string;
  value: string;
  dim: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="luster-eyebrow">{label}</span>
      <span
        className={cn(
          "text-[14px] leading-none tracking-[-0.005em]",
          dim ? "text-luster-faint" : "text-luster-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
