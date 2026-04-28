import { motion } from "framer-motion";
import { cn } from "@/ui/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
}

const TRACK_WIDTH = 32;
const TRACK_HEIGHT = 18;
const HANDLE_SIZE = 14;
const HANDLE_INSET = 2;
const HANDLE_TRAVEL = TRACK_WIDTH - HANDLE_SIZE - HANDLE_INSET * 2;

export function Switch({ checked, onChange, ariaLabel }: SwitchProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.95 }}
      animate={{
        backgroundColor: checked ? "#a07a30" : "#d6cfc0",
      }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        padding: HANDLE_INSET,
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-luster-border-strong",
      )}
    >
      <motion.span
        aria-hidden
        animate={{ x: checked ? HANDLE_TRAVEL : 0 }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 36,
          mass: 0.6,
        }}
        style={{
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        }}
        className="rounded-full bg-white shadow-[0_1px_2px_rgba(26,24,22,0.18),0_0_0_1px_rgba(26,24,22,0.04)]"
      />
    </motion.button>
  );
}
