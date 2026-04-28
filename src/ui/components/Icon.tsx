import type { ReactElement, SVGProps } from "react";

type IconName =
  | "close"
  | "kebab"
  | "back"
  | "sliders"
  | "sparkle"
  | "arrow-right";

const PATHS: Record<IconName, ReactElement> = {
  close: (
    <path
      d="M5 5 L13 13 M13 5 L5 13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  kebab: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="3.5" r="1.3" />
      <circle cx="9" cy="9" r="1.3" />
      <circle cx="9" cy="14.5" r="1.3" />
    </g>
  ),
  back: (
    <path
      d="M11 4 L5 9 L11 14"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  sliders: (
    <g strokeLinecap="round" fill="none">
      <path d="M3 5 H15" />
      <path d="M3 13 H15" />
      <circle cx="11" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="13" r="1.6" fill="currentColor" stroke="none" />
    </g>
  ),
  sparkle: (
    <path
      d="M9 2 L10.4 7 L15 9 L10.4 11 L9 16 L7.6 11 L3 9 L7.6 7 Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  "arrow-right": (
    <path
      d="M5 9 H13 M9 5 L13 9 L9 13"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      width={size}
      height={size}
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
