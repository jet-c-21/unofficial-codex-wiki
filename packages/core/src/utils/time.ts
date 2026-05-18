import type { IsoDateTime } from "../domain/doc-page.js";

export function nowIsoDateTime(): IsoDateTime {
  return new Date().toISOString();
}

export function isIsoDateTime(value: string): value is IsoDateTime {
  return !Number.isNaN(Date.parse(value));
}
