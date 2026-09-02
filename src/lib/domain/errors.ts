export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "VALIDATION"
      | "CUTOFF_PASSED"
      | "INSUFFICIENT_CAPACITY"
      | "INVALID_STATE",
  ) {
    super(message);
  }
}
