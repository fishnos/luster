import type { ProviderId } from "@/core/types";
import { cn } from "@/ui/cn";

const PROVIDERS: ProviderId[] = ["gemini", "anthropic", "openai"];

const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
};

export interface ProviderTabsProps {
  active: ProviderId;
  onSelect: (provider: ProviderId) => void;
  keyPresent?: Record<ProviderId, boolean>;
}

export function ProviderTabs({
  active,
  onSelect,
  keyPresent,
}: ProviderTabsProps) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      {PROVIDERS.map((provider) => {
        const isActive = provider === active;
        return (
          <button
            key={provider}
            type="button"
            onClick={() => onSelect(provider)}
            className={cn(
              "luster-press relative pb-1 font-medium transition-colors",
              isActive
                ? "text-luster-ink"
                : "text-luster-faint hover:text-luster-muted",
            )}
          >
            {PROVIDER_LABEL[provider]}
            {keyPresent?.[provider] && (
              <span className="ml-1 inline-block h-1 w-1 rounded-full bg-luster-ok align-middle" />
            )}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-px bg-luster-ink" />
            )}
          </button>
        );
      })}
    </div>
  );
}
