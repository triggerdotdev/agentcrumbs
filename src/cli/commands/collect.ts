import { CollectorServer } from "../../collector/server.js";
import { formatCrumbPretty } from "../format.js";
import type { Crumb } from "../../types.js";

const DEFAULT_PORT = 8374;

export async function collect(args: string[]): Promise<void> {
  const portStr = getFlag(args, "--port");
  const port = portStr ? parseInt(portStr, 10) : DEFAULT_PORT;
  const storeDir = getFlag(args, "--dir");
  const quiet = args.includes("--quiet");

  const server = new CollectorServer(port, storeDir ?? undefined);

  server.on("crumb", (crumb: Crumb) => {
    if (!quiet) {
      process.stdout.write(formatCrumbPretty(crumb) + "\n");
    }
  });

  server.on("error", (err: Error) => {
    process.stderr.write(`Collector error: ${err.message}\n`);
  });

  await server.start();

  const store = server.getStore();
  process.stdout.write(`agentcrumbs collector\n`);
  process.stdout.write(`  http:  http://localhost:${port}/crumb\n`);
  process.stdout.write(`  store: ${store.getFilePath()}\n`);
  process.stdout.write(`  press ctrl+c to stop\n\n`);

  const shutdown = () => {
    process.stdout.write("\nStopping collector...\n");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}
