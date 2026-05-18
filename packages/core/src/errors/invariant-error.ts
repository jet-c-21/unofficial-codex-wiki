import { AppError } from "./app-error.js";

export class InvariantError extends AppError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super("INVARIANT_VIOLATION", message, details);
    this.name = "InvariantError";
  }
}
