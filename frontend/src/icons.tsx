// Minimal line icons (1.5px stroke, 20px box). Decorative: callers supply the accessible label.

type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconLibrary = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 3.5h3v13h-3zM8.5 3.5h3v13h-3z" />
    <path d="M13.2 4.2l2.9-.8 3 12.6-2.9.8z" />
  </Svg>
);

export const IconViewer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 2.5h7l3.5 3.5v11.5H5z" />
    <path d="M12 2.5V6h3.5M7.5 10h5M7.5 13h5" />
  </Svg>
);

export const IconStanza = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3h3M3 3v3M17 3h-3M17 3v3M3 17h3M3 17v-3M17 17h-3M17 17v-3" />
    <path d="M7 8h6M7 11h6" />
  </Svg>
);

export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 5.5c-1.8-1.4-4.2-2-6.5-2v11c2.3 0 4.7.6 6.5 2 1.8-1.4 4.2-2 6.5-2v-11c-2.3 0-4.7.6-6.5 2z" />
    <path d="M10 5.5v11" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="3.5" />
    <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16.5 12.2A6.5 6.5 0 0 1 7.8 3.5a6.5 6.5 0 1 0 8.7 8.7z" />
  </Svg>
);

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7" />
    <path d="M3.5 12.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
  </Svg>
);

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

export const IconBookmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 3h9v14L10 13.5 5.5 17z" />
  </Svg>
);

export const IconWarning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3 2.5 16.5h15z" />
    <path d="M10 8v4M10 14.2v.1" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 5 10 10M15 5 5 15" />
  </Svg>
);

export const IconLogo = ({ size = 28 }: IconProps) => (
  // Eight-point star (khatam) in fine line: the one permitted ornament, used only as the logo.
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="7" y="7" width="14" height="14" stroke="currentColor" strokeWidth="1.25" />
    <rect x="7" y="7" width="14" height="14" stroke="currentColor" strokeWidth="1.25" transform="rotate(45 14 14)" />
    <circle cx="14" cy="14" r="2.2" fill="currentColor" />
  </svg>
);
