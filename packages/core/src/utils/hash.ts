import { createHash } from "node:crypto";
import type { Sha256Hash } from "../domain/content-hash.js";

export function sha256(value: string | Buffer): Sha256Hash {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
