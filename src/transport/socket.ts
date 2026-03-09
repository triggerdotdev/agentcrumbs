import type { Crumb } from "../types.js";

const DEFAULT_URL = "http://localhost:8374/crumb";

export function sendCrumb(crumb: Crumb, url: string = DEFAULT_URL): void {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(crumb),
  }).catch(() => {});
}
