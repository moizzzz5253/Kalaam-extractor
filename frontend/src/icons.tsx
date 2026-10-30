// Line icons (1.5px stroke) and the Noor Scope mark. Decorative: callers supply the accessible label.

type IconProps = { size?: number };

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.5 4.5 7 10l5.5 5.5" />
  </Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.5 4.5 13 10l-5.5 5.5" />
  </Svg>
);
export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 10h10" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 5v10M5 10h10" />
  </Svg>
);
export const IconFitWidth = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 10h15M5 7.5 2.5 10 5 12.5M15 7.5l2.5 2.5-2.5 2.5" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8.5" cy="8.5" r="5" />
    <path d="m12.5 12.5 4 4" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 5 10 10M15 5 5 15" />
  </Svg>
);
export const IconFitPage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5.5" y="3" width="9" height="14" />
    <path d="M10 1v3M10 16v3" />
  </Svg>
);
export const IconFocus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
  </Svg>
);
export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6V3h3M14 3h3v3M17 14v3h-3M6 17H3v-3" />
    <path d="M7 8h6M7 12h6" />
  </Svg>
);
export const IconStamp = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="10" width="14" height="4" />
    <path d="M5 17h10M8 10V7h4v3M10 7V3" />
  </Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h12M8 6V4h4v2M6 6l1 10.5h6L14 6" />
  </Svg>
);
export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="7" width="9.5" height="9.5" />
    <path d="M4 13V4h9" />
  </Svg>
);

/** Noor Scope mark: a geometric eight-point star (two squares) with a centre point. */
export function NoorMark({ size = 26, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <svg
      className={`noor-mark${animate ? " is-drawing" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect x="7" y="7" width="14" height="14" stroke="currentColor" strokeWidth="1.6" pathLength={1} />
      <rect x="7" y="7" width="14" height="14" stroke="currentColor" strokeWidth="1.6" pathLength={1} transform="rotate(45 14 14)" />
      <circle cx="14" cy="14" r="2.2" fill="currentColor" />
    </svg>
  );
}
