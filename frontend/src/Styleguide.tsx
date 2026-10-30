import { NoorMark } from "./icons";
import { contrast, PRESETS, PresetId, ThemeVars, useTheme } from "./theme";

// Text/background pairs the UI actually uses. WCAG AA: 4.5:1 for normal text.
const PAIRS: [keyof ThemeVars, keyof ThemeVars][] = [
  ["text", "bg"],
  ["text", "panel"],
  ["text", "panel2"],
  ["dim", "panel"],
  ["dim", "panel2"],
  ["phos", "panel"],
  ["amber", "panel"],
  ["cyan", "panel"],
  ["red", "panel"],
];

/** Every token, type style, LED, node and box state on one page, for review (brief §13.1). Open with #styleguide. */
export default function Styleguide() {
  const { state, vars, setPreset } = useTheme();
  const names = Object.keys(vars) as (keyof ThemeVars)[];

  return (
    <div className="styleguide">
      <header className="sg-head">
        <div className="brand">
          <NoorMark />
          <span className="wordmark">
            NOOR<b>//</b>SCOPE
          </span>
          <small>style guide</small>
        </div>
        <a className="chip btn" href="#">
          ← BACK TO WORKBENCH
        </a>
      </header>

      <section className="panel">
        <h3>
          <span>PRESETS</span>
          <em>{state.preset === "custom" ? "custom" : PRESETS[state.preset].label}</em>
        </h3>
        <div className="sg-row">
          {(Object.keys(PRESETS) as PresetId[]).map((id) => (
            <button key={id} className={`btn${state.preset === id ? " on" : ""}`} onClick={() => setPreset(id)}>
              {PRESETS[id].label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>
          <span>COLOUR TOKENS</span>
          <em>var(--name) · current preset</em>
        </h3>
        <div className="sg-swatches">
          {names.map((n) => (
            <div key={n} className="sg-swatch">
              <i style={{ background: `var(--${n})` }} />
              <code>--{n}</code>
              <span className="dim">{vars[n]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>
          <span>CONTRAST · ALL PRESETS</span>
          <em>WCAG AA needs 4.5 : 1 for body text</em>
        </h3>
        <div className="sg-table-wrap">
          <table className="sg-table">
            <thead>
              <tr>
                <th>text on surface</th>
                {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                  <th key={id}>{PRESETS[id].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAIRS.map(([fg, bg]) => (
                <tr key={`${fg}-${bg}`}>
                  <td>
                    <code>
                      --{fg} / --{bg}
                    </code>
                  </td>
                  {(Object.keys(PRESETS) as PresetId[]).map((id) => {
                    const v = PRESETS[id].vars;
                    const r = contrast(v[fg], v[bg]);
                    return (
                      <td key={id} className={r >= 4.5 ? "pass" : "fail"}>
                        {r.toFixed(2)} {r >= 4.5 ? "AA" : "low"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>
          <span>TYPE</span>
          <em>placeholder text only</em>
        </h3>
        <div className="sg-type">
          <h1>Kalaam A — Sample Title</h1>
          <p>Interface · JetBrains Mono 13 / 1.45 · 1,234 pages · 595 × 842 pt · 182 ms</p>
          <p className="dim">Secondary text in --dim</p>
          <p className="sg-arabic" lang="ar" dir="rtl">
            نموذج · ١٢٣٤٥٦٧٨٩٠
          </p>
          <p className="sg-urdu" lang="ur" dir="rtl">
            نمونہ
          </p>
        </div>
      </section>

      <section className="panel">
        <h3>
          <span>LEDS · CHIPS · BUTTONS</span>
        </h3>
        <div className="sg-row">
          <span className="chip"><i className="led" /> idle</span>
          <span className="chip"><i className="led ok" /> ok</span>
          <span className="chip"><i className="led busy" /> working</span>
          <span className="chip"><i className="led bad" /> fault</span>
          <button className="btn">Button</button>
          <button className="btn on">Selected</button>
          <button className="btn" disabled>Disabled</button>
          <button className="btn-go">PRIMARY ACTION</button>
        </div>
      </section>

      <section className="panel">
        <h3>
          <span>PIPELINE NODE STATES</span>
        </h3>
        <div className="pipe">
          {(["idle", "active", "done", "error"] as const).map((s, i) => (
            <span key={s} style={{ display: "contents" }}>
              {i > 0 && <span className={`wire ${s === "done" ? "lit" : s === "error" ? "dead" : ""}`} />}
              <span className={`node ${s}`}>
                <span className="node-head">
                  <i className={`led ${s === "done" ? "ok" : s === "active" ? "" : s === "error" ? "bad" : ""}`} />
                  <span className="nm">{s.toUpperCase()}</span>
                </span>
                <span className="ms">{s === "idle" ? "idle" : "182 ms"}</span>
              </span>
            </span>
          ))}
        </div>
        <p className="hint">Static here: the blinking LED and the moving wire pulse only run while a real step is active.</p>
      </section>

      <section className="panel">
        <h3>
          <span>BOUNDING-BOX STATES</span>
          <em>for the next milestone</em>
        </h3>
        <div className="sg-boxes">
          {[
            ["idle", "Idle"],
            ["hover", "Hover"],
            ["selected", "Selected"],
            ["suggested", "Suggested · 94%"],
            ["approved", "Approved"],
          ].map(([k, label]) => (
            <div key={k} className="sg-paper">
              <div className={`bbox bbox-${k}`}>
                <span className="bbox-pill">{k === "approved" ? "١" : "1"}</span>
                {k === "suggested" && <span className="bbox-conf">94%</span>}
                {k === "selected" &&
                  ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => <i key={h} className={`bbox-h h-${h}`} />)}
              </div>
              <span className="sg-cap">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
