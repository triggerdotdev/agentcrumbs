export type CrumbType =
  | "crumb"
  | "scope:enter"
  | "scope:exit"
  | "scope:error"
  | "snapshot"
  | "assert"
  | "time"
  | "session:start"
  | "session:end";

export type Crumb = {
  ts: string;
  ns: string;
  msg: string;
  data?: unknown;
  dt: number;
  pid: number;
  type: CrumbType;
  ctx?: Record<string, unknown>;
  traceId?: string;
  depth?: number;
  tags?: string[];
  sid?: string;
};

export type CrumbOptions = {
  tags?: string[];
};

export type ScopeContext = {
  crumb: TrailFunction;
  traceId: string;
};

export type Session = {
  id: string;
  name: string;
  crumb: (msg: string, data?: unknown, options?: CrumbOptions) => void;
  end: () => void;
};

export type TrailFunction = {
  (msg: string, data?: unknown, options?: CrumbOptions): void;
  enabled: boolean;
  namespace: string;
  child: (ctx: Record<string, unknown>) => TrailFunction;
  scope: <T>(
    name: string,
    fn: (ctx: ScopeContext) => T | Promise<T>
  ) => T | Promise<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrap: <T extends (...args: any[]) => any>(name: string, fn: T) => T;
  time: (label: string) => void;
  timeEnd: (label: string, data?: unknown) => void;
  snapshot: (label: string, obj: unknown) => void;
  assert: (condition: unknown, msg: string) => void;
  session: {
    (name: string): Session;
    <T>(name: string, fn: (session: Session) => T | Promise<T>): T | Promise<T>;
  };
};

export type Sink = {
  write(crumb: Crumb): void;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
};

export type Formatter = {
  format(crumb: Crumb): string;
};

export type AgentCrumbsConfig = {
  ns: string;
  port?: number;
  format?: "pretty" | "json";
};
