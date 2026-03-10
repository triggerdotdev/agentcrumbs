import path from "node:path";
import os from "node:os";
import { CrumbStore } from "../../collector/store.js";

export async function clear(_args: string[]): Promise<void> {
  const store = new CrumbStore(path.join(os.homedir(), ".agentcrumbs"));
  store.clear();
  process.stdout.write("Crumb trail cleared.\n");
}
