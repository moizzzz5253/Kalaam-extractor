// Noor Scope theme: four presets plus a custom accent/background, ported from PDF//SCOPE's theme.js.
// Colours are written as CSS variables on :root; components only ever read var(--name).
// The choice is saved in this browser (localStorage) and applied before the first paint.

import { useCallback, useSyncExternalStore } from "react";

export type ThemeVars = Record<
  "bg" | "top" | "panel" | "panel2" | "line" | "line2" | "phos" | "amber" | "cyan" | "red" | "violet" | "text" | "dim",
  string
>;

export interface Preset {
  label: string;
  light: boolean;
  vars: ThemeVars;
}

export const PRESETS = {
  night: {
    label: "Noor Night",
    light: false,
    vars: {
      bg: "#040f0c", top: "#061511", panel: "#0a1b16", panel2: "#0d221c", line: "#173a31", line2: "#22584a",
      phos: "#3ee6a8", amber: "#e0b35a", cyan: "#7fd6e8", red: "#e0606a", violet: "#b9a3e3",
      text: "#efe8d4", dim: "#8fa79c",
    },
  },
  ivory: {
    label: "Ivory Manuscript",
    light: true,
    vars: {
      bg: "#f6f1e4", top: "#ece5d2", panel: "#fffdf6", panel2: "#f7f2e3", line: "#d8cdb0", line2: "#b9aa86",
      phos: "#0f7a58", amber: "#9a6b12", cyan: "#1d6f8a", red: "#b03a3a", violet: "#6b4fa0",
      text: "#1f2a24", dim: "#5f6b62",
    },
  },
  emerald: {
    label: "Emerald Court",
    light: false,
    vars: {
      bg: "#02100b", top: "#04170f", panel: "#08200f", panel2: "#0b2a16", line: "#1b4a2c", line2: "#2b6b40",
      phos: "#7cf0a0", amber: "#e8c770", cyan: "#9ee8d0", red: "#e87070", violet: "#c3b0f0",
      text: "#eef5e6", dim: "#90ab92",
    },
  },
  dusk: {
    label: "Gold Dusk",
    light: false,
    vars: {
      bg: "#110c06", top: "#180f08", panel: "#201509", panel2: "#2a1c0c", line: "#4a3418", line2: "#6e4f22",
      phos: "#f0c96a", amber: "#ffdf8a", cyan: "#e8b07a", red: "#e86a5a", violet: "#d0a8e0",
      text: "#f7ecd6", dim: "#b09a74",
    },
  },
} satisfies Record<string, Preset>;

export type PresetId = keyof typeof PRESETS;
export const DEFAULT_PRESET: PresetId = "night";

export type ThemeState =
  | { preset: PresetId }
  | { preset: "custom"; base: PresetId; accent: string; bg: string };

const KEY = "noorscope.theme";

/** Relative luminance of a #rrggbb colour (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function isPreset(id: unknown): id is PresetId {
  return typeof id === "string" && id in PRESETS;
}

/** Custom: the picked background and accent drive the rest of the palette (same rule as PDF//SCOPE). */
function customVars(st: Extract<ThemeState, { preset: "custom" }>): ThemeVars {
  const base = PRESETS[st.base].vars;
  const light = luminance(st.bg) > 0.3;
  const mix = (pct: number, c: string) => `color-mix(in srgb, ${st.bg} ${pct}%, ${c})`;
  return {
    ...base,
    bg: st.bg,
    top: mix(92, light ? "#fff" : "#000"),
    panel: mix(90, st.accent),
    panel2: mix(84, st.accent),
    line: mix(72, st.accent),
    line2: mix(55, st.accent),
    phos: st.accent,
    text: light ? "#1f2a24" : "#efe8d4",
    dim: light ? "#4f5d55" : "#9db3a9",
  };
}

export function resolve(st: ThemeState): ThemeVars {
  return st.preset === "custom" ? customVars(st) : PRESETS[st.preset].vars;
}

export function isLight(st: ThemeState): boolean {
  return st.preset === "custom" ? luminance(st.bg) > 0.3 : PRESETS[st.preset].light;
}

function apply(st: ThemeState) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(resolve(st))) root.style.setProperty(`--${k}`, v);
  root.dataset.theme = st.preset;
  root.dataset.tone = isLight(st) ? "light" : "dark";
  root.style.colorScheme = isLight(st) ? "light" : "dark";
}

function load(): ThemeState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.preset === "custom" && isPreset(raw.base) && typeof raw.accent === "string" && typeof raw.bg === "string")
      return raw;
    if (isPreset(raw?.preset)) return { preset: raw.preset };
  } catch {
    /* unreadable or blocked storage */
  }
  return { preset: DEFAULT_PRESET };
}

let state = load();
const listeners = new Set<() => void>();
apply(state); // runs at import time, before React renders, so there is no flash of the wrong theme

function set(next: ThemeState) {
  state = next;
  apply(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private window: keep it for this page only */
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  const setPreset = useCallback((preset: PresetId) => set({ preset }), []);
  const setCustom = useCallback((accent: string, bg: string) => {
    const base = state.preset === "custom" ? state.base : state.preset;
    set({ preset: "custom", base, accent, bg });
  }, []);
  const reset = useCallback(() => set({ preset: DEFAULT_PRESET }), []);
  return { state: current, vars: resolve(current), setPreset, setCustom, reset };
}
