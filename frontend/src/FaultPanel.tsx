import { useState } from "react";
import { IconClose, IconCopy } from "./icons";
import { clearFaults, Fault } from "./telemetry";

/** Readable fault report for the latest fault, with a copy button. */
export default function FaultPanel({ fault, count, onClose }: { fault: Fault; count: number; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const report = [
    `${fault.code}  ${fault.title}`,
    `step:  ${fault.step}`,
    `cause: ${fault.cause}`,
    `fix:   ${fault.fix}`,
    `at:    ${fault.at.toISOString()}`,
    `detail: ${fault.detail}`,
  ].join("\n");

  return (
    <section className="fault" role="alert" aria-label="Fault report">
      <div className="fhead">
        <span>FAULT</span>
        <span className="code">{fault.code}</span>
        <span className="dimred">{count > 1 ? `latest of ${count}` : ""}</span>
        <button className="tbtn close" aria-label="Close fault report" onClick={onClose}>
          <IconClose />
        </button>
      </div>
      <p className="ttl">{fault.title}</p>
      <div className="fkv">
        <div>STEP</div>
        <div>
          <code>{fault.step}</code>
        </div>
        <div>CAUSE</div>
        <div>
          <bdi>{fault.cause}</bdi>
        </div>
        <div>FIX</div>
        <div className="fix">{fault.fix}</div>
        <div>TIME</div>
        <div>{fault.at.toLocaleTimeString()}</div>
      </div>
      <div className="acts">
        <button
          className="btn sm"
          onClick={() => {
            navigator.clipboard?.writeText(report).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          <IconCopy size={14} /> {copied ? "copied" : "copy report"}
        </button>
        <button
          className="btn sm"
          onClick={() => {
            clearFaults();
            onClose();
          }}
        >
          clear faults
        </button>
      </div>
    </section>
  );
}
