export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
};

export type ValidationCheck = {
  name: string;
  ok: boolean;
  issues: ValidationIssue[];
};

export type ValidationReport = {
  validatedAt: string;
  ok: boolean;
  errorCount: number;
  warningCount: number;
  checks: ValidationCheck[];
};

export function createValidationReport(validatedAt: string, checks: ValidationCheck[]): ValidationReport {
  const issues = checks.flatMap((check) => check.issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    validatedAt,
    ok: errorCount === 0,
    errorCount,
    warningCount,
    checks
  };
}

export function createCheck(name: string, issues: ValidationIssue[]): ValidationCheck {
  return {
    name,
    ok: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
