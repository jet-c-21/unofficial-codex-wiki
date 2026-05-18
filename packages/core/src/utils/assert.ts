import { InvariantError } from "../errors/invariant-error.js";

export function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}
