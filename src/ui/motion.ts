import type { ComponentType } from "react";

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EASE_BLADE: [number, number, number, number] = [0.7, 0, 0.18, 1];

export const SECTION_TRANSITION = { duration: 0.22, ease: EASE_OUT };
export const TAB_TRANSITION = { duration: 0.32, ease: EASE_BLADE };

export type LusterIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;
