// Live record of what the app is doing: pipeline stage states, timed steps, a log and faults.
// Feeds the pipeline strip, Step Inspector, scope trace, API log and FAULTS chip.
// Everything here is measured in the browser around real API calls; nothing is simulated.

import { useSyncExternalStore } from "react";

export type StageId = "input" | "index" | "select" | "compose" | "export";
export type StageState = "idle" | "active" | "done" | "error";

export const STAGES: { id: StageId; name: string; built: boolean }[] = [
  { id: "input", name: "INPUT", built: true },
  { id: "index", name: "INDEX", built: true },
  { id: "select", name: "SELECT", built: false },
  { id: "compose", name: "COMPOSE", built: false },
  { id: "export", name: "EXPORT", built: false },
];

export interface Step {
  id: number;
  stage: StageId | null;
  name: string; // e.g. upload_document
  detail: string; // inputs, in words
  status: "running" | "ok" | "error";
  ms: number | null;
  at: Date;
  result?: string;
}

export interface LogLine {
  id: number;
  at: Date;
  level: "info" | "warn" | "error";
  text: string;
}

export interface Fault {
  id: number;
  code: string;
  title: string;
  cause: string;
  fix: string;
  step: string;
  detail: string;
  at: Date;
}

export interface Telemetry {
  link: "unknown" | "up" | "down";
  stages: Record<StageId, { state: StageState; ms: number | null }>;
  steps: Step[];
  log: LogLine[];
  faults: Fault[];
  latency: { at: number; ms: number; ok: boolean }[]; // API round trips, for the scope trace
}

const MAX_ROWS = 200;
let seq = 0;

let data: Telemetry = {
  link: "unknown",
  stages: {
    input: { state: "idle", ms: null },
    index: { state: "idle", ms: null },
    select: { state: "idle", ms: null },
    compose: { state: "idle", ms: null },
    export: { state: "idle", ms: null },
  },
  steps: [],
  log: [],
  faults: [],
  latency: [],
};

const listeners = new Set<() => void>();
function emit(next: Telemetry) {
  data = next;
  listeners.forEach((l) => l());
}

export function useTelemetry(): Telemetry {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => data,
  );
}

export function log(level: LogLine["level"], text: string) {
  emit({ ...data, log: [...data.log, { id: ++seq, at: new Date(), level, text }].slice(-MAX_ROWS) });
}

export function setLink(link: Telemetry["link"]) {
  if (link === data.link) return;
  emit({ ...data, link });
  log(link === "up" ? "info" : "error", link === "up" ? "backend link up" : "backend link down: /api/health not answering");
}

export function clearFaults() {
  emit({ ...data, faults: [] });
}

/** Turn an error message from the API client into a readable fault report. */
function explain(stepName: string, message: string): Pick<Fault, "code" | "title" | "cause" | "fix"> {
  const status = /^(\d{3}):/.exec(message)?.[1];
  if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(message) || status === "500" && /proxy/i.test(message))
    return {
      code: "E-LINK",
      title: "The backend did not answer",
      cause: "The FastAPI server is not running, or the dev proxy points at the wrong port.",
      fix: "Start the backend (uvicorn app.main:app) and check KX_API_URL in frontend/.env.local.",
    };
  if (status === "400")
    return {
      code: "E-INPUT",
      title: "The file was rejected",
      cause: message.replace(/^\d{3}:\s*/, ""),
      fix: "Check that the file is a real, unencrypted PDF.",
    };
  if (status === "413")
    return { code: "E-SIZE", title: "The file is too large", cause: message, fix: "Split the PDF or raise the size limit." };
  return {
    code: status ? `E-${status}` : "E-APP",
    title: `${stepName} failed`,
    cause: message,
    fix: "See the API log for the request that failed, then retry.",
  };
}

/**
 * Run one real operation as a pipeline step: marks the stage active, times it, records
 * the step and the round trip, and files a fault if it throws.
 */
export async function track<T>(
  stage: StageId | null,
  name: string,
  detail: string,
  fn: () => Promise<T>,
  summarize?: (r: T) => string,
  cancelled?: () => boolean, // true when the caller abandoned the work: drop the step, no fault
): Promise<T> {
  const id = ++seq;
  const t0 = performance.now();
  const step: Step = { id, stage, name, detail, status: "running", ms: null, at: new Date() };
  const stageBefore = stage ? data.stages[stage] : null;
  emit({
    ...data,
    steps: [step, ...data.steps].slice(0, MAX_ROWS),
    stages: stage ? { ...data.stages, [stage]: { state: "active", ms: null } } : data.stages,
  });
  log("info", `${name} ← ${detail}`);
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    const summary = summarize?.(result);
    emit({
      ...data,
      steps: data.steps.map((s) => (s.id === id ? { ...s, status: "ok", ms, result: summary } : s)),
      stages: stage ? { ...data.stages, [stage]: { state: "done", ms } } : data.stages,
      latency: [...data.latency, { at: Date.now(), ms, ok: true }].slice(-120),
    });
    log("info", `${name} ✓ ${ms} ms${summary ? ` · ${summary}` : ""}`);
    return result;
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const message = (e as Error).message;
    if (cancelled?.()) {
      // Leave the stage alone if a newer step in it is still running (e.g. the retry that replaced this one).
      const othersRunning = data.steps.some((s) => s.id !== id && s.stage === stage && s.status === "running");
      emit({
        ...data,
        steps: data.steps.filter((s) => s.id !== id),
        stages:
          stage && stageBefore && !othersRunning ? { ...data.stages, [stage]: stageBefore } : data.stages,
      });
      log("info", `${name} cancelled after ${ms} ms`);
      throw e;
    }
    const fault: Fault = { id, ...explain(name, message), step: name, detail: message, at: new Date() };
    emit({
      ...data,
      steps: data.steps.map((s) => (s.id === id ? { ...s, status: "error", ms, result: message } : s)),
      stages: stage ? { ...data.stages, [stage]: { state: "error", ms } } : data.stages,
      latency: [...data.latency, { at: Date.now(), ms, ok: false }].slice(-120),
      faults: [fault, ...data.faults].slice(0, 20),
    });
    log("error", `${name} ✗ ${ms} ms · ${message}`);
    throw e;
  }
}
