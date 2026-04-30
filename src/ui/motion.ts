import type { ComponentType } from "react";

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const PANEL_TRANSITION = { duration: 0.22, ease: EASE_OUT };
export const SECTION_TRANSITION = { duration: 0.2, ease: EASE_OUT };
export const TAB_TRANSITION = { duration: 0.16, ease: EASE_OUT };

export type LusterIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;
