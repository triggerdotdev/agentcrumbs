import type { Crumb, Sink } from "../types.js";
import { sendCrumb } from "../transport/http.js";

export class HttpSink implements Sink {
  constructor(private url: string) {}

  write(crumb: Crumb): void {
    sendCrumb(crumb, this.url);
  }
}
