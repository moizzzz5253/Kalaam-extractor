import { Fragment } from "react";
import { STAGES, StageId, useTelemetry } from "./telemetry";

interface Props {
  onInspect: (stage: StageId) => void;
  focused: StageId | null;
}

/** INPUT → INDEX → SELECT → COMPOSE → EXPORT, with real states and timings from telemetry. */
export default function PipelineStrip({ onInspect, focused }: Props) {
  const { stages } = useTelemetry();
  const running = STAGES.find((s) => stages[s.id].state === "active");

  return (
    <section className="panel pipe-panel" aria-label="Signal flow">
      <h3>
        <span>SIGNAL FLOW</span>
        <em aria-live="polite">{running ? `${running.name} running…` : "idle · waiting for a command"}</em>
      </h3>
      <div className="pipe">
        {STAGES.map((s, i) => {
          const st = stages[s.id];
          const prev = i > 0 ? stages[STAGES[i - 1].id] : null;
          const wire = !prev
            ? null
            : st.state === "active" && prev.state === "done"
              ? "flow"
              : prev.state === "done" && (st.state === "done" || st.state === "active")
                ? "lit"
                : st.state === "error"
                  ? "dead"
                  : "";
          const label = !s.built ? "not built" : st.state === "idle" ? "idle" : st.state;
          return (
            <Fragment key={s.id}>
              {wire !== null && <span className={`wire ${wire}`} aria-hidden="true" />}
              <button
                className={`node ${st.state}${s.built ? "" : " unbuilt"}${focused === s.id ? " focused" : ""}`}
                onClick={() => onInspect(s.id)}
                aria-label={`${s.name}: ${label}${st.ms !== null ? `, ${st.ms} ms` : ""}. Show steps.`}
                title={s.built ? "Show this stage's steps in the Step Inspector" : "Arrives in a later milestone"}
              >
                <span className="node-head">
                  <i className={`led ${st.state === "done" ? "ok" : st.state === "active" ? "busy" : st.state === "error" ? "bad" : ""}`} />
                  <span className="nm">{s.name}</span>
                </span>
                <span className="ms">{st.ms !== null ? `${st.ms.toLocaleString()} ms` : label}</span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
