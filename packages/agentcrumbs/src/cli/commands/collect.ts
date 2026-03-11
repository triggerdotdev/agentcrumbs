import { CollectorServer } from "../../collector/server.js";
import { formatCrumbPretty } from "../format.js";
import { getFlag, hasFlag } from "../args.js";
import type { Crumb } from "../../types.js";

const DEFAULT_PORT = 8374;

export async function collect(args: string[]): Promise<void> {
  const portStr = getFlag(args, "--port");
  const port = portStr ? parseInt(portStr, 10) : DEFAULT_PORT;
  const storeDir = getFlag(args, "--dir");
  const quiet = hasFlag(args, "--quiet");

  const server = new CollectorServer(port, storeDir ?? undefined);

  server.on("crumb", (crumb: Crumb) => {
    if (!quiet) {
      process.stdout.write(formatCrumbPretty(crumb, { showApp: true }) + "\n");
    }
  });

  server.on("error", (err: Error) => {
    process.stderr.write(`Collector error: ${err.message}\n`);
  });

  await server.start();

  process.stdout.write(`agentcrumbs collector\n`);
  process.stdout.write(`  http:  http://localhost:${port}/crumb\n`);
  process.stdout.write(`  crumbs stored per-app in ~/.agentcrumbs/<app>/\n`);
  process.stdout.write(`  press ctrl+c to stop\n\n`);

  const shutdown = () => {
    process.stdout.write("\nStopping collector...\n");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
