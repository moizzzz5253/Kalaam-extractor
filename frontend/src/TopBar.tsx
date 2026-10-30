import { useEffect, useRef, useState } from "react";
import { NoorMark } from "./icons";
import { useTelemetry } from "./telemetry";
import { DEFAULT_PRESET, PRESETS, PresetId, useTheme } from "./theme";

const INTRO_KEY = "noorscope.introSeen";

function firstVisit(): boolean {
  try {
    if (localStorage.getItem(INTRO_KEY)) return false;
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    return false;
  }
  return true;
}

interface Props {
  docTitle: string | null;
  onOpenFaults: () => void;
  onToggleInspector: () => void;
  inspectorOpen: boolean;
}

export default function TopBar({ docTitle, onOpenFaults, onToggleInspector, inspectorOpen }: Props) {
  const t = useTelemetry();
  const [themeOpen, setThemeOpen] = useState(false);
  const [intro] = useState(firstVisit);
  const faults = t.faults.length;

  return (
    <header className="topbar">
      <div className="brand">
        <NoorMark animate={intro} />
        <span className="wordmark">
          NOOR<b>//</b>SCOPE
        </span>
        <small>signal-flow Kalaam workbench</small>
      </div>

      <div className="hstats">
        <span className="chip" title="Backend connection (/api/health, checked every 10 s)">
          <i className={`led ${t.link === "up" ? "ok" : t.link === "down" ? "bad" : ""}`} />
          {t.link === "up" ? "LINK UP" : t.link === "down" ? "LINK DOWN" : "LINK …"}
        </span>
        <span className="chip chip-doc" title="Active document">
          DOC <b dir="auto">{docTitle ?? "none"}</b>
        </span>
        <button
          className={`chip btn chip-inspector${inspectorOpen ? " on" : ""}`}
          onClick={onToggleInspector}
          aria-pressed={inspectorOpen}
          title="Show or hide the inspector column"
        >
          INSPECTOR
        </button>
        <div className="theme-anchor">
          <button
            className={`chip btn${themeOpen ? " on" : ""}`}
            onClick={() => setThemeOpen((o) => !o)}
            aria-expanded={themeOpen}
            title="Change colours"
          >
            THEME
          </button>
          {themeOpen && <ThemePanel onClose={() => setThemeOpen(false)} />}
        </div>
        <button
          className={`chip btn${faults ? " has-faults" : ""}`}
          onClick={onOpenFaults}
          title={faults ? "Open the latest fault report" : "No faults"}
        >
          FAULTS <b>{faults}</b>
        </button>
      </div>
    </header>
  );
}

function ThemePanel({ onClose }: { onClose: () => void }) {
  const { state, vars, setPreset, setCustom, reset } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement!.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // A colour input needs #rrggbb; custom presets may hold color-mix() strings for derived values only.
  const hex = (v: string, fallback: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
  const base = PRESETS[DEFAULT_PRESET].vars;

  return (
    <div className="theme-panel" ref={ref} role="dialog" aria-label="Theme">
      <h4>THEME</h4>
      <div className="tp-presets">
        {(Object.keys(PRESETS) as PresetId[]).map((id) => {
          const p = PRESETS[id];
          return (
            <button
              key={id}
              className={`tp-preset${state.preset === id ? " on" : ""}`}
              onClick={() => setPreset(id)}
              aria-pressed={state.preset === id}
            >
              <span className="sw" aria-hidden="true">
                {[p.vars.bg, p.vars.phos, p.vars.amber].map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              {p.label}
            </button>
          );
        })}
      </div>
      <label>
        Accent
        <input type="color" value={hex(vars.phos, base.phos)} onChange={(e) => setCustom(e.target.value, hex(vars.bg, base.bg))} />
      </label>
      <label>
        Background
        <input type="color" value={hex(vars.bg, base.bg)} onChange={(e) => setCustom(hex(vars.phos, base.phos), e.target.value)} />
      </label>
      <div className="tp-row">
        <a className="tp-link" href="#styleguide" onClick={onClose}>
          Style guide
        </a>
        <button className="tp-reset" onClick={reset}>
          Reset to Noor Night
        </button>
      </div>
    </div>
  );
}
