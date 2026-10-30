import { ReactNode } from "react";
import {
  IconBook,
  IconLibrary,
  IconLogo,
  IconMoon,
  IconSettings,
  IconStanza,
  IconSun,
  IconViewer,
} from "./icons";

export type Screen = "library" | "viewer";
export type Theme = "light" | "dark";

interface RailItem {
  id: Screen | "stanzas" | "book" | "settings";
  label: string;
  icon: ReactNode;
  enabled: boolean;
  hint?: string;
}

interface Props {
  screen: Screen;
  canOpenViewer: boolean;
  onNavigate: (s: Screen) => void;
  crumbs: string[];
  theme: Theme;
  onToggleTheme: () => void;
  status?: ReactNode;
  children: ReactNode;
}

/** App frame: icon rail on the left, 48px top bar, content fills the rest. */
export default function Shell({
  screen,
  canOpenViewer,
  onNavigate,
  crumbs,
  theme,
  onToggleTheme,
  status,
  children,
}: Props) {
  const items: RailItem[] = [
    { id: "library", label: "Library", icon: <IconLibrary />, enabled: true },
    {
      id: "viewer",
      label: "Viewer",
      icon: <IconViewer />,
      enabled: canOpenViewer,
      hint: canOpenViewer ? undefined : "Open a document first",
    },
    { id: "stanzas", label: "Stanzas", icon: <IconStanza />, enabled: false, hint: "Coming in the next milestone" },
    { id: "book", label: "Handy Book Studio", icon: <IconBook />, enabled: false, hint: "Coming in a later milestone" },
  ];

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <div className="rail-logo" title="Kalaam Studio">
          <IconLogo />
        </div>
        <ul>
          {items.map((it) => {
            const active = it.id === screen;
            const tip = it.hint ? `${it.label} · ${it.hint}` : it.label;
            return (
              <li key={it.id}>
                <button
                  className={`rail-btn${active ? " is-active" : ""}`}
                  aria-label={it.label}
                  aria-current={active ? "page" : undefined}
                  data-tip={tip}
                  disabled={!it.enabled}
                  onClick={() => (it.id === "library" || it.id === "viewer") && onNavigate(it.id)}
                >
                  {it.icon}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="rail-foot">
          <button
            className="rail-btn"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            data-tip={theme === "dark" ? "Light theme" : "Dark theme"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
          <button className="rail-btn" aria-label="Settings" data-tip="Settings · Coming later" disabled>
            <IconSettings />
          </button>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <ol className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <li key={i} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                <bdi>{c}</bdi>
              </li>
            ))}
          </ol>
          <div className="topbar-status" aria-live="polite">
            {status}
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
