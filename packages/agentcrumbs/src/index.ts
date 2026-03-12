export { trail } from "./trail.js";
export { addSink, removeSink } from "./trail.js";
export { configure } from "./env.js";
export { NOOP } from "./noop.js";
export { MemorySink } from "./sinks/memory.js";
export { ConsoleSink } from "./sinks/console.js";
export { HttpSink } from "./sinks/socket.js";
export type {
  TrailFunction,
  Crumb,
  CrumbType,
  CrumbOptions,
  Sink,
  Formatter,
  Session,
  ScopeContext,
  AgentCrumbsConfig,
} from "./types.js";
