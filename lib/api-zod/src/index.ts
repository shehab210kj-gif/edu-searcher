import { File as NodeFile } from "node:buffer";
if (typeof globalThis.File === "undefined") {
  (globalThis as any).File = NodeFile;
}

export * from "./generated/api";
