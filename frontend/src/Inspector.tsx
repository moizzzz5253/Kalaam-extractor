import { ReactNode, useEffect, useRef, useState } from "react";
import { StageId, STAGES, Step, useTelemetry } from "./telemetry";
import { useTheme } from "./theme";
import type { Readout } from "./Viewer";

interface Props {
  selection: ReactNode;
  readout: Readout | null;
  focusedStage: StageId | null;
  onClearFocus: () => void;
}

const PT_PER_MM = 72 / 25.4;

export default function Inspector({ selection, readout, focusedStage, onClearFocus }: Props) {
  return (
    <>
      {selection}
      <TechPanel readout={readout} />
      <StepInspector focusedStage={focusedStage} onClearFocus={onClearFocus} />
      <ScopePanel />
      <ApiLog />
    </>
  );
}

function TechPanel({ readout }: { readout: Readout | null }) {
  if (!readout)
    return (
      <section className="panel" aria-label="Technical readout">
        <h3>
          <span>PAGE GEOMETRY</span>
          <em>no page</em>
        </h3>
        <div className="empty-state small">
          <p>Open a document to see the page box, rotation and zoom.</p>
        </div>
      </section>
    );
  const [x0, y0, x1, y1] = readout.view;
  const w = x1 - x0;
  const h = y1 - y0;
  const rows: [string, string, string?][] = [
    ["page", `${readout.page0 + 1} of ${readout.total.toLocaleString()}`, "physical page, 1-based"],
    ["box", `[${fmt(x0)}, ${fmt(y0)}, ${fmt(x1)}, ${fmt(y1)}] pt`, "page.view: the crop box PDF.js renders"],
    ["size", `${fmt(w)} × ${fmt(h)} pt`, `w = x1 − x0 = ${fmt(x1)} − ${fmt(x0)}`],
    ["size", `${fmt(w / PT_PER_MM)} × ${fmt(h / PT_PER_MM)} mm`, "mm = pt × 25.4 / 72"],
    ["rotation", `${readout.rotate}°`, "/Rotate of the page"],
    ["zoom", `${Math.round(readout.scale * 100)} % · ${readout.scale.toFixed(2)} px/pt`, "CSS px = pt × zoom"],
    ["dpr", `${readout.dpr}`, `canvas px = CSS px × ${readout.dpr}`],
    ["canvas", `${Math.round(w * readout.scale * readout.dpr)} × ${Math.round(h * readout.scale * readout.dpr)} px`, "w × zoom × dpr"],
  ];
  return (
    <section className="panel" aria-label="Technical readout">
      <h3>
        <span>PAGE GEOMETRY</span>
        <em>hover a value for its formula</em>
      </h3>
      <dl className="kv">
        {rows.map(([k, v, f], i) => (
          <div key={i} title={f}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function StepInspector({ focusedStage, onClearFocus }: { focusedStage: StageId | null; onClearFocus: () => void }) {
  const { steps } = useTelemetry();
  const [open, setOpen] = useState<number | null>(null);
  const shown = focusedStage ? steps.filter((s) => s.stage === focusedStage) : steps;
  const stageName = STAGES.find((s) => s.id === focusedStage)?.name;

  return (
    <section className="panel" aria-label="Step inspector">
      <h3>
        <span>STEP INSPECTOR</span>
        <em>
          {stageName ? (
            <button className="link-btn" onClick={onClearFocus} title="Show all stages">
              {stageName} only · show all
            </button>
          ) : (
            "what the app just did"
          )}
        </em>
      </h3>
      {shown.length === 0 ? (
        <div className="empty-state small">
          <p>
            {stageName ? `No ${stageName} steps yet.` : "No steps yet. Import or open a document; each request appears here with its timing."}
          </p>
        </div>
      ) : (
        <ol className="steps">
          {shown.slice(0, 40).map((s) => (
            <StepRow key={s.id} step={s} open={open === s.id || s.status !== "ok"} onToggle={() => setOpen(open === s.id ? null : s.id)} />
          ))}
        </ol>
      )}
    </section>
  );
}

function StepRow({ step, open, onToggle }: { step: Step; open: boolean; onToggle: () => void }) {
  const stage = STAGES.find((s) => s.id === step.stage)?.name ?? "API";
  return (
    <li className={`step ${step.status === "running" ? "playing" : step.status}`}>
      <button className="step-head" onClick={onToggle} aria-expanded={open}>
        <span className="n">{stage}</span>
        <code className="step-name">{step.name}</code>
        <em>{step.ms === null ? "running" : `${step.ms.toLocaleString()} ms`}</em>
      </button>
      {open && (
        <div className="ex">
          <div>
            <span className="dim">in </span>
            <bdi>{step.detail}</bdi>
          </div>
          {step.result && (
            <div>
              <span className="dim">out </span>
              <bdi>{step.result}</bdi>
            </div>
          )}
          <div className="dim">{step.at.toLocaleTimeString()}</div>
        </div>
      )}
    </li>
  );
}

/** Oscilloscope trace of API round-trip times (ms), one point per request. */
function ScopePanel() {
  const { latency } = useTelemetry();
  const { state } = useTheme();
  const ref = useRef<HTMLCanvasElement>(null);
  const last = latency[latency.length - 1];

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    ctx.clearRect(0, 0, W, H);
    // graticule
    ctx.strokeStyle = v("--line");
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round((H * i) / 4) + 0.5);
      ctx.lineTo(W, Math.round((H * i) / 4) + 0.5);
      ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.round((W * i) / 8) + 0.5, 0);
      ctx.lineTo(Math.round((W * i) / 8) + 0.5, H);
      ctx.stroke();
    }
    if (latency.length === 0) return;
    const max = Math.max(100, ...latency.map((p) => p.ms)) * 1.15;
    const pts = latency.slice(-40);
    const step = W / Math.max(1, 39);
    ctx.strokeStyle = v("--phos");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = i * step;
      const y = H - (p.ms / max) * (H - 6) - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.fillStyle = p.ok ? v("--phos") : v("--red");
      ctx.fillRect(i * step - 2, H - (p.ms / max) * (H - 6) - 5, 4, 4);
    });
    ctx.fillStyle = v("--dim");
    ctx.font = `11px ${v("--mono")}`;
    ctx.fillText(`${Math.round(max)} ms`, 4, 12);
  }, [latency, state]);

  return (
    <section className="panel" aria-label="Scope">
      <h3>
        <span>SCOPE</span>
        <em>CH1 · API round trip{last ? ` · last ${last.ms} ms` : ""}</em>
      </h3>
      <canvas
        ref={ref}
        className="scope"
        role="img"
        aria-label={last ? `API round-trip times; last request took ${last.ms} milliseconds` : "No requests measured yet"}
      />
    </section>
  );
}

function ApiLog() {
  const { log } = useTelemetry();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const shown = errorsOnly ? log.filter((l) => l.level === "error") : log;

  useEffect(() => {
    const b = boxRef.current;
    if (b) b.scrollTop = b.scrollHeight;
  }, [shown.length]);

  return (
    <section className="panel" aria-label="API log">
      <h3>
        <span>API LOG</span>
        <em>
          <label className="check">
            <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} /> errors only
          </label>
        </em>
      </h3>
      <div className="log" ref={boxRef}>
        {shown.length === 0 ? (
          <div className="dim">{errorsOnly ? "no errors" : "waiting for the first request"}</div>
        ) : (
          shown.map((l) => (
            <div key={l.id} className={l.level}>
              <span className="t">{l.at.toLocaleTimeString([], { hour12: false })}</span> <bdi>{l.text}</bdi>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
