import { motion, type Variants } from "framer-motion";
import { blurFadeIn, staggerContainer } from "@/ui/motion/staggered";
import { cn } from "@/ui/cn";

export interface SplitTextProps {
  text: string;
  by?: "word" | "char";
  className?: string;
  itemClassName?: string;
  container?: Variants;
  item?: Variants;
  delay?: number;
  stagger?: number;
  ariaLabel?: string;
}

export function SplitText({
  text,
  by = "word",
  className,
  itemClassName,
  container,
  item,
  delay = 0,
  stagger,
  ariaLabel,
}: SplitTextProps) {
  const tokens = by === "word" ? text.split(/(\s+)/) : Array.from(text);

  const containerVariants: Variants =
    container ??
    (stagger !== undefined || delay > 0
      ? {
          hidden: { opacity: 1 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: stagger ?? 0.08,
              delayChildren: delay,
            },
          },
        }
      : staggerContainer);

  const itemVariants = item ?? blurFadeIn;

  return (
    <motion.span
      aria-label={ariaLabel ?? text}
      className={cn("inline-block", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {tokens.map((token, index) => {
        if (/^\s+$/.test(token)) {
          return (
            <span key={index} aria-hidden>
              {token}
            </span>
          );
        }
        return (
          <motion.span
            key={index}
            aria-hidden
            variants={itemVariants}
            className={cn("inline-block will-change-transform", itemClassName)}
          >
            {token}
          </motion.span>
        );
      })}
    </motion.span>
  );
}
