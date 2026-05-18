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

export type ValidationIssueSummary = {
  code: string;
  severity: ValidationSeverity;
  count: number;
  checks: string[];
  exampleMessages: string[];
  examplePaths: string[];
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

export function summarizeValidationIssues(report: ValidationReport, limit = 5): ValidationIssueSummary[] {
  const summariesByKey = new Map<string, ValidationIssueSummary>();

  for (const check of report.checks) {
    for (const issue of check.issues) {
      const key = `${issue.severity}:${issue.code}`;
      const summary = summariesByKey.get(key) ?? {
        code: issue.code,
        severity: issue.severity,
        count: 0,
        checks: [],
        exampleMessages: [],
        examplePaths: []
      };

      summary.count += 1;
      pushUnique(summary.checks, check.name, limit);
      pushUnique(summary.exampleMessages, issue.message, limit);
      if (issue.path !== undefined) {
        pushUnique(summary.examplePaths, issue.path, limit);
      }
      summariesByKey.set(key, summary);
    }
  }

  return [...summariesByKey.values()]
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === "error" ? -1 : 1;
      }

      return right.count - left.count || left.code.localeCompare(right.code);
    })
    .slice(0, limit);
}

function pushUnique(values: string[], value: string, limit: number): void {
  if (values.includes(value) || values.length >= limit) {
    return;
  }

  values.push(value);
}
