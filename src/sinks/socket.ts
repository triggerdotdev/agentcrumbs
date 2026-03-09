import type { Crumb, Sink } from "../types.js";
import { sendCrumb } from "../transport/socket.js";

export class HttpSink implements Sink {
  constructor(private url: string) {}

  write(crumb: Crumb): void {
    sendCrumb(crumb, this.url);
  }
}

/** @deprecated Use HttpSink instead */
export const SocketSink = HttpSink;
